import { checkAuth } from '../../../utils/checkAuth';
import supabase from '../../../utils/supabase';

type Body = {
	action: 'START_QUESTION' | 'FINISH_QUESTION' | 'STOP_QUIZ';
	quizId?: string;
	questionId?: string;
	stateData: unknown;
};

const broadcastStateMap = {
	START_QUESTION: 'QUESTION',
	FINISH_QUESTION: 'ANSWER_REVEAL',
	STOP_QUIZ: 'IDLE',
} as const;

const quizStateMap = {
	START_QUESTION: 'question',
	FINISH_QUESTION: 'answer_reveal',
	STOP_QUIZ: 'idle',
} as const;

export async function POST(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const { action, quizId, questionId, stateData }: Body = await request.json();

	if (action === 'START_QUESTION' && quizId && questionId) {
		const duration = (stateData as { duration?: number })?.duration ?? 30;
		const { error: e1 } = await supabase.from('quiz').update({ state: 'question' }).eq('id', quizId).eq('streamer_id', auth.channelId);
		const { error: e2 } = await supabase.from('question').update({ state: 'running', started_at: new Date().toISOString(), timer_duration: duration }).eq('id', questionId);
		if (e1) console.error('[session] quiz update error (START_QUESTION):', e1);
		if (e2) console.error('[session] question update error (START_QUESTION):', e2);
	}

	if (action === 'FINISH_QUESTION' && questionId) {
		const { error: e1 } = await supabase.from('question').update({ state: 'finished' }).eq('id', questionId);
		// Update the quiz via streamer_id since quizId is not always provided here
		const { error: e2 } = await supabase.from('quiz').update({ state: 'answer_reveal' }).eq('streamer_id', auth.channelId).eq('state', 'question');
		if (e1) console.error('[session] question update error (FINISH_QUESTION):', e1);
		if (e2) console.error('[session] quiz update error (FINISH_QUESTION):', e2);
	}

	if (action === 'STOP_QUIZ') {
		const { error: e1 } = await supabase.from('quiz').update({ state: 'idle' }).eq('streamer_id', auth.channelId);
		if (e1) console.error('[session] quiz update error (STOP_QUIZ):', e1);
		if (quizId) {
			const { error: e2 } = await supabase.from('question').update({ state: 'idle' }).eq('quiz_id', quizId);
			if (e2) console.error('[session] question update error (STOP_QUIZ):', e2);
		}
	}

	const channel = supabase.channel(`quickiz.${auth.channelId}`);
	await channel.send({
		type: 'broadcast',
		event: 'quiz-state',
		payload: { stateName: broadcastStateMap[action], stateData },
	});

	return Response.json({ message: 'ok' });
}
