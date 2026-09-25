import { checkAuth } from '../../../utils/checkAuth';
import { broadcastQuizState, getQuizState } from '../../../utils/quizState';
import supabase from '../../../utils/supabase';

// Maps broadcast state names (sent to viewers) to quiz.state values (stored in DB)
const quizStateByBroadcast: Partial<Record<string, string>> = {
	LEADERBOARD: 'leaderboard',
	IDLE: 'running', // back to quiz-ready — session still active, viewers see waiting screen
};

/**
 * - LEADERBOARD / IDLE: persist the new quiz.state, then broadcast the state rebuilt from the DB.
 * - HIDDEN / SHOWN: persist quiz.hidden (keyed by quizId: the quiz may still be
 *   idle on the quiz-ready page). HIDDEN is broadcast as-is; SHOWN re-broadcasts
 *   the current DB state so viewers get back to whatever is live (e.g. the running question).
 */
export async function POST(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) {
		return auth;
	}

	const { stateName, quizId }: { stateName: string; quizId?: string } = await request.json();

	if (stateName === 'HIDDEN' || stateName === 'SHOWN') {
		if (!quizId) {
			return Response.json({ error: 'quizId is required' }, { status: 400 });
		}
		const { error } = await supabase
			.from('quiz')
			.update({ hidden: stateName === 'HIDDEN' })
			.eq('id', quizId)
			.eq('streamer_id', auth.channelId);
		if (error) {
			console.error('[/api/quiz/broadcast] Supabase hidden update error:', error);
			return Response.json({ error: error.message }, { status: 500 });
		}
		if (stateName === 'HIDDEN') {
			// Broadcast directly rather than from the DB: an idle quiz resolves to IDLE there.
			await broadcastQuizState(auth.channelId, { stateName, stateData: {} });
			return Response.json({ message: 'ok', serverNow: new Date().toISOString() });
		}
	}

	const newQuizState = quizStateByBroadcast[stateName];
	if (newQuizState !== undefined) {
		const { data: activeQuizzes } = await supabase
			.from('quiz')
			.select('id')
			.eq('streamer_id', auth.channelId)
			.neq('state', 'idle');
		const activeIds = (activeQuizzes ?? []).map((q) => q.id);

		// Leaving a question without revealing it: close it so viewers can no
		// longer answer and it can't be picked up again as the "running" one.
		if (activeIds.length > 0) {
			const { error } = await supabase
				.from('question')
				.update({ state: 'finished' })
				.in('quiz_id', activeIds)
				.eq('state', 'running');
			if (error) {
				console.error('[/api/quiz/broadcast] Supabase question update error:', error);
			}
		}

		const { error } = await supabase
			.from('quiz')
			.update({ state: newQuizState })
			.eq('streamer_id', auth.channelId)
			.neq('state', 'idle');
		if (error) {
			console.error('[/api/quiz/broadcast] Supabase update error:', error);
		}
	}

	const { serverNow, ...state } = await getQuizState(auth.channelId);
	await broadcastQuizState(auth.channelId, state);

	return Response.json({ message: 'ok', serverNow });
}
