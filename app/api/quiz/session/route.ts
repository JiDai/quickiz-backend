import { checkAuth } from '../../../utils/checkAuth';
import { broadcastQuizState, getQuizState } from '../../../utils/quizState';
import supabase from '../../../utils/supabase';

type Body = {
	action: 'START_QUESTION' | 'FINISH_QUESTION' | 'STOP_QUIZ';
	quizId?: string;
	questionId?: string;
	// Only `duration` is read (START_QUESTION). The broadcast payload is rebuilt
	// from the DB so it always matches what /api/quiz/state returns.
	stateData?: { duration?: number };
};

export async function POST(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) {
		return auth;
	}

	const { action, quizId, questionId, stateData }: Body = await request.json();

	// Write order matters: viewers resync on Postgres Changes, so the quiz row
	// (quiz.state) is always written LAST — when it changes, the question rows
	// it points to are already consistent.
	if (action === 'START_QUESTION' && quizId && questionId) {
		const duration = stateData?.duration ?? 30;
		// getQuizState ignores soft-deleted questions: starting one would leave
		// the quiz in 'question' with nothing to show, i.e. IDLE for viewers.
		const { data: target } = await supabase
			.from('question')
			.select('id')
			.eq('id', questionId)
			.eq('quiz_id', quizId)
			.is('deleted_at', null)
			.maybeSingle();
		if (!target) {
			return Response.json({ error: 'Question not found' }, { status: 404 });
		}
		// Only one active quiz per streamer: a quiz left 'running' by "Change quiz"
		// would otherwise compete in getQuizState (and its `hidden` flag with it).
		const { data: otherQuizzes, error: eOther } = await supabase
			.from('quiz')
			.select('id')
			.eq('streamer_id', auth.channelId)
			.neq('id', quizId)
			.neq('state', 'idle');
		const otherIds = (otherQuizzes ?? []).map((q) => q.id);
		if (otherIds.length > 0) {
			const { error: eOtherQuestions } = await supabase
				.from('question')
				.update({ state: 'idle' })
				.in('quiz_id', otherIds);
			const { error: eOtherQuiz } = await supabase
				.from('quiz')
				.update({ state: 'idle', hidden: false })
				.in('id', otherIds);
			if (eOtherQuestions) {
				console.error('[session] other questions reset error (START_QUESTION):', eOtherQuestions);
			}
			if (eOtherQuiz) {
				console.error('[session] other quizzes reset error (START_QUESTION):', eOtherQuiz);
			}
		}
		if (eOther) {
			console.error('[session] other quizzes lookup error (START_QUESTION):', eOther);
		}
		// A question left 'running' (streamer went home mid-question) would
		// otherwise compete with the new one.
		const { error: e0 } = await supabase
			.from('question')
			.update({ state: 'finished' })
			.eq('quiz_id', quizId)
			.eq('state', 'running')
			.neq('id', questionId);
		const { error: e1 } = await supabase
			.from('question')
			.update({
				state: 'running',
				started_at: new Date().toISOString(),
				timer_duration: duration,
			})
			.eq('id', questionId);
		const { error: e2 } = await supabase
			.from('quiz')
			.update({ state: 'question' })
			.eq('id', quizId)
			.eq('streamer_id', auth.channelId);
		if (e0) {
			console.error('[session] stale question update error (START_QUESTION):', e0);
		}
		if (e1) {
			console.error('[session] question update error (START_QUESTION):', e1);
		}
		if (e2) {
			console.error('[session] quiz update error (START_QUESTION):', e2);
		}
	}

	if (action === 'FINISH_QUESTION' && questionId) {
		const { error: e1 } = await supabase
			.from('question')
			.update({ state: 'finished' })
			.eq('id', questionId);
		// Update the quiz via streamer_id since quizId is not always provided here
		const { error: e2 } = await supabase
			.from('quiz')
			.update({ state: 'answer_reveal' })
			.eq('streamer_id', auth.channelId)
			.eq('state', 'question');
		if (e1) {
			console.error('[session] question update error (FINISH_QUESTION):', e1);
		}
		if (e2) {
			console.error('[session] quiz update error (FINISH_QUESTION):', e2);
		}
	}

	if (action === 'STOP_QUIZ') {
		if (quizId) {
			const { error: e2 } = await supabase
				.from('question')
				.update({ state: 'idle' })
				.eq('quiz_id', quizId);
			if (e2) {
				console.error('[session] question update error (STOP_QUIZ):', e2);
			}
		}
		const { error: e1 } = await supabase
			.from('quiz')
			// A stopped quiz starts its next session visible.
			.update({ state: 'idle', hidden: false })
			.eq('streamer_id', auth.channelId);
		if (e1) {
			console.error('[session] quiz update error (STOP_QUIZ):', e1);
		}
	}

	const { serverNow, ...state } = await getQuizState(auth.channelId);
	await broadcastQuizState(auth.channelId, state);

	return Response.json({ message: 'ok', serverNow });
}
