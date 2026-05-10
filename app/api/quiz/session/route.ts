import { checkAuth } from '../../../utils/checkAuth';
import supabase from '../../../utils/supabase';

type Body = {
	action: 'START_QUESTION' | 'FINISH_QUESTION' | 'STOP_QUIZ';
	quizId?: string;
	questionId?: string;
	stateData: unknown;
};

export async function POST(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const { action, quizId, questionId, stateData }: Body = await request.json();

	const stateNameMap = {
		START_QUESTION: 'QUESTION',
		FINISH_QUESTION: 'ANSWER_REVEAL',
		STOP_QUIZ: 'IDLE',
	} as const;

	if (action === 'START_QUESTION' && quizId && questionId) {
		await supabase.from('quiz').update({ active: true }).eq('id', quizId).eq('streamer_id', auth.channelId);
		await supabase.from('question').update({ state: 'running' }).eq('id', questionId);
	}

	if (action === 'FINISH_QUESTION' && questionId) {
		await supabase.from('question').update({ state: 'finished' }).eq('id', questionId);
	}

	if (action === 'STOP_QUIZ') {
		await supabase.from('quiz').update({ active: false }).eq('streamer_id', auth.channelId);
		if (quizId) {
			await supabase.from('question').update({ state: 'idle' }).eq('quiz_id', quizId);
		}
	}

	const channel = supabase.channel(`quickiz.${auth.channelId}`);
	await channel.send({
		type: 'broadcast',
		event: 'quiz-state',
		payload: { stateName: stateNameMap[action], stateData },
	});

	return Response.json({ message: 'ok' });
}
