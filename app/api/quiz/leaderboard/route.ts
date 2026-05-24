import { checkAuth } from '../../../utils/checkAuth';
import supabase from '../../../utils/supabase';

export async function GET(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) {
		return auth;
	}

	const { data: quiz } = await supabase
		.from('quiz')
		.select('id, scoring_type')
		.eq('streamer_id', auth.channelId)
		.neq('state', 'idle')
		.single();

	if (!quiz) {
		return Response.json([]);
	}

	const scoringType: string = quiz.scoring_type ?? 'correct_count';

	const { data: questions } = await supabase
		.from('question')
		.select('id, good_answer, points, started_at, timer_duration')
		.eq('quiz_id', quiz.id)
		.is('deleted_at', null);

	if (!questions?.length) {
		return Response.json([]);
	}

	const { data: answers } = await supabase
		.from('viewer_answer')
		.select('*')
		.in(
			'question_id',
			questions.map((q) => q.id),
		);

	if (!answers?.length) {
		return Response.json([]);
	}

	const map: Record<string, { name: string; score: number }> = {};

	for (const row of answers) {
		const question = questions.find((q) => q.id === row.question_id);
		if (!question) {
			continue;
		}

		if (!map[row.viewer_id]) {
			map[row.viewer_id] = { name: row.viewer_name ?? row.viewer_id, score: 0 };
		}

		const isCorrect = Number(row.answer) === Number(question.good_answer);
		if (!isCorrect) {
			continue;
		}

		if (scoringType === 'correct_count') {
			map[row.viewer_id].score += 1;
		} else if (scoringType === 'time_bonus') {
			const duration = question.timer_duration ?? 30;
			const startedAt = question.started_at ? new Date(question.started_at).getTime() : null;
			const answeredAt = row.created_at ? new Date(row.created_at).getTime() : null;
			if (startedAt && answeredAt) {
				const elapsed = (answeredAt - startedAt) / 1000;
				const pts = Math.max(0, Math.floor(duration - elapsed));
				map[row.viewer_id].score += pts;
			} else {
				map[row.viewer_id].score += 100;
			}
		} else if (scoringType === 'weighted') {
			map[row.viewer_id].score += question.points ?? 1;
		}
	}

	const scores = Object.entries(map)
		.map(([viewerId, { name, score }]) => ({ viewerId, name, score }))
		.sort((a, b) => b.score - a.score);

	return Response.json({ scores, scoringType });
}
