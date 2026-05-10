import { checkAuth } from '../../../../utils/checkAuth';
import { assertQuizNotActive } from '../../../../utils/assertQuizNotActive';
import { QuestionRequest } from '../../../../types/questionRequest';
import { runQuery } from '../../../../utils/runQuery';
import supabase from '../../../../utils/supabase';

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ quizId: string }> },
) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const { quizId } = await params;

	const activeError = await assertQuizNotActive(quizId);
	if (activeError) return activeError;

	const body: QuestionRequest = await request.json();

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
				.eq('id', quizId),
	);
	console.log(`data: `, data, error);
	if (data) {
		return Response.json({ status: 'ok' });
	} else return error;
}
