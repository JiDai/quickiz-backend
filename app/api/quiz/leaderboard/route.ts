import { checkAuth } from '../../../utils/checkAuth';
import supabase from '../../../utils/supabase';

export async function GET(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const { data: quiz } = await supabase
		.from('quiz')
		.select('id')
		.eq('streamer_id', auth.channelId)
		.eq('active', true)
		.single();

	if (!quiz) return Response.json([]);

	const { data: questions } = await supabase
		.from('question')
		.select('id, good_answer')
		.eq('quiz_id', quiz.id)
		.is('deleted_at', null);

	if (!questions?.length) return Response.json([]);

	const { data: answers } = await supabase
		.from('viewer_answer')
		.select('*')
		.in('question_id', questions.map((q) => q.id));

	if (!answers?.length) return Response.json([]);

	const map: Record<string, { name: string; correct: number }> = {};
	for (const row of answers) {
		const question = questions.find((q) => q.id === row.question_id);
		if (!question) continue;
		if (!map[row.viewer_id]) {
			map[row.viewer_id] = { name: row.viewer_name ?? row.viewer_id, correct: 0 };
		}
		if (Number(row.answer) === Number(question.good_answer)) map[row.viewer_id].correct++;
	}

	return Response.json(
		Object.entries(map)
			.map(([viewerId, { name, correct }]) => ({ viewerId, name, correct }))
			.sort((a, b) => b.correct - a.correct),
	);
}
