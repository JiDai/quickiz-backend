import { checkAuth } from '../../../utils/checkAuth';
import supabase from '../../../utils/supabase';

// Maps broadcast state names (sent to viewers) to quiz.state values (stored in DB)
const quizStateByBroadcast: Partial<Record<string, string>> = {
	LEADERBOARD: 'leaderboard',
	IDLE: 'running', // back to quiz-ready — session still active, viewers see waiting screen
};

export async function POST(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) {
		return auth;
	}

	const body: { stateName: string; stateData: unknown } = await request.json();
	const { stateName, stateData } = body;

	const channel = supabase.channel(`quickiz.${auth.channelId}`);
	await channel.send({
		type: 'broadcast',
		event: 'quiz-state',
		payload: { stateName, stateData },
	});

	const newQuizState = quizStateByBroadcast[stateName];
	if (newQuizState !== undefined) {
		const { error } = await supabase
			.from('quiz')
			.update({ state: newQuizState })
			.eq('streamer_id', auth.channelId)
			.neq('state', 'idle');
		if (error) {
			console.error('[/api/quiz/broadcast] Supabase update error:', error);
		}
	}

	return Response.json({ message: 'ok' });
}
