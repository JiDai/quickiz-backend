import { checkAuth } from '../../../utils/checkAuth';
import supabase from '../../../utils/supabase';

/**
 * Returns the current quiz state for a streamer's channel so viewers who join
 * mid-session land on the right screen without waiting for the next broadcast.
 *
 * Reads quiz.state directly — the single source of truth for the session state.
 */
export async function GET(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const { data: quiz, error } = await supabase
		.from('quiz')
		.select('state, questions:question!quiz_id(*)')
		.eq('streamer_id', auth.channelId)
		.neq('state', 'idle')
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		console.error('[/api/quiz/state] Supabase error:', error);
		return Response.json({ error: error.message }, { status: 500 });
	}

	if (!quiz) {
		return Response.json({ stateName: 'IDLE', stateData: {} });
	}

	const questions = [...(quiz.questions ?? [])].sort(
		(a: { position: number }, b: { position: number }) => a.position - b.position,
	);

	switch (quiz.state) {
		case 'question': {
			const running = questions.find((q: { state: string }) => q.state === 'running');
			if (!running) return Response.json({ stateName: 'IDLE', stateData: {} });
			return Response.json({
				stateName: 'QUESTION',
				stateData: { question: running, duration: 30 },
			});
		}
		case 'answer_reveal': {
			const finished = questions.findLast((q: { state: string }) => q.state === 'finished');
			if (!finished) return Response.json({ stateName: 'IDLE', stateData: {} });
			return Response.json({ stateName: 'ANSWER_REVEAL', stateData: { question: finished } });
		}
		case 'leaderboard': {
			return Response.json({
				stateName: 'LEADERBOARD',
				stateData: { totalQuestions: questions.length },
			});
		}
		default:
			// 'running' or anything unexpected → viewer sees waiting screen
			return Response.json({ stateName: 'IDLE', stateData: {} });
	}
}
