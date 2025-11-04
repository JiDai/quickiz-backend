import { createClient } from '@supabase/supabase-js';
import { QuestionRequest } from '../../../../types/questionRequest';
import { checkAuth } from '../../../../utils/checkAuth';
import { runQuery } from '../../../../utils/runQuery';

const supabase = createClient(
	`https://${process.env.SUPABASE_ID}.supabase.co`,
	process.env.SUPABASE_KEY!,
);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	await checkAuth(request, supabase);

	const body: QuestionRequest = await request.json();

	const { id } = (await params) || {};

	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('question')
				.upsert({
					title: body.title,
					answer1: body.answer1,
					answer2: body.answer2,
					answer3: body.answer3,
					answer4: body.answer4,
					good_answer: body.goodAnswer,
					quiz_id: body.quizId,
				})
				.eq('id', id),
	);
	console.log(`data: `, data, error);
	if (data) {
		return Response.json({
			status: 'ok',
		});
	} else return error;
}
