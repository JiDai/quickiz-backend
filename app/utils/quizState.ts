import supabase from './supabase';

type QuestionRow = {
	id: string;
	state: string;
	started_at: string | null;
	timer_duration: number | null;
	deleted_at: string | null;
	answer1: string;
	answer2: string;
	answer3: string | null;
	answer4: string | null;
};

export type QuizStatePayload = {
	stateName: string;
	stateData: Record<string, unknown>;
	// Server clock at build time — clients use it to correct their clock skew
	// so every timer counts down against the same reference (question.started_at).
	serverNow: string;
};

/**
 * Number of viewers per answer (index = answer index). Answers are frozen once
 * the question is finished, so this is computed once per reveal state build.
 * Head-only count queries: no row is transferred, no 1000-row limit.
 */
async function getAnswerCounts(question: QuestionRow): Promise<number[]> {
	const nbAnswers = [question.answer1, question.answer2, question.answer3, question.answer4].filter(Boolean).length;
	return Promise.all(
		Array.from({ length: nbAnswers }, async (_, answer) => {
			const { count, error } = await supabase
				.from('viewer_answer')
				.select('*', { count: 'exact', head: true })
				.eq('question_id', question.id)
				.eq('answer', answer);
			if (error) {
				console.error('[quizState] answer count error:', error);
			}
			return count ?? 0;
		}),
	);
}

const byStartedAtDesc =(a: QuestionRow, b: QuestionRow) =>
	(b.started_at ?? '').localeCompare(a.started_at ?? '');

/**
 * Builds the viewer-facing state from the DB — the single source of truth.
 * Used both by GET /api/quiz/state (resync) and by every broadcast, so a
 * broadcast and a later resync always carry the exact same payload.
 */
export async function getQuizState(channelId: string): Promise<QuizStatePayload> {
	const serverNow = () => new Date().toISOString();
	const idle = (): QuizStatePayload => ({ stateName: 'IDLE', stateData: {}, serverNow: serverNow() });

	const { data: quiz, error } = await supabase
		.from('quiz')
		.select('id, state, hidden, scoring_type, questions:question!quiz_id(*)')
		.eq('streamer_id', channelId)
		.neq('state', 'idle')
		.is('deleted_at', null)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		throw error;
	}
	if (!quiz) {
		return idle();
	}

	// The streamer hid the overlay: it stays hidden across every transition until shown again.
	if (quiz.hidden) {
		return { stateName: 'HIDDEN', stateData: {}, serverNow: serverNow() };
	}

	// Exclude soft-deleted questions so a stale deleted row can't masquerade as
	// the running question and cause a question-ID mismatch in the late-join check.
	const questions = ((quiz.questions ?? []) as QuestionRow[]).filter((q) => !q.deleted_at);

	switch (quiz.state) {
		case 'question': {
			// Most recently started one — never rely on position, questions can be replayed.
			const running = questions.filter((q) => q.state === 'running').sort(byStartedAtDesc)[0];
			if (!running) {
				return idle();
			}
			return {
				stateName: 'QUESTION',
				stateData: { question: running, duration: running.timer_duration ?? 30, scoringType: quiz.scoring_type },
				serverNow: serverNow(),
			};
		}
		case 'answer_reveal': {
			const finished = questions.filter((q) => q.state === 'finished').sort(byStartedAtDesc)[0];
			if (!finished) {
				return idle();
			}
			return {
				stateName: 'ANSWER_REVEAL',
				stateData: {
					question: finished,
					scoringType: quiz.scoring_type,
					answerCounts: await getAnswerCounts(finished),
				},
				serverNow: serverNow(),
			};
		}
		case 'leaderboard':
			return {
				stateName: 'LEADERBOARD',
				stateData: { totalQuestions: questions.length },
				serverNow: serverNow(),
			};
		default:
			// 'running' or anything unexpected → viewer sees waiting screen
			return idle();
	}
}

export async function broadcastQuizState(channelId: string, payload: Omit<QuizStatePayload, 'serverNow'>) {
	const channel = supabase.channel(`quickiz.${channelId}`);
	try {
		await channel.send({ type: 'broadcast', event: 'quiz-state', payload });
	} finally {
		// Channels are never joined here (REST send) — remove them so they don't pile up.
		await supabase.removeChannel(channel);
	}
}
