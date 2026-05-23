import { checkAuth } from '../../../../../utils/checkAuth';
import { assertQuizNotActive } from '../../../../../utils/assertQuizNotActive';
import { runQuery } from '../../../../../utils/runQuery';
import supabase from '../../../../../utils/supabase';

interface QuestionUpdate {
	title: string;
	answer1: string;
	answer2: string;
	answer3: string;
	answer4: string;
	goodAnswer: number;
	points?: number;
}

async function getQuizIdForQuestion(questionId: string): Promise<string | null> {
	const { data } = await supabase
		.from('question')
		.select('quiz_id')
		.eq('id', questionId)
		.single();
	return data?.quiz_id ?? null;
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ questionId: string }> },
) {
	const { questionId } = await params;

	const [data, error] = await runQuery(
		async () => await supabase.from('question').select('*').eq('id', questionId).single(),
	);

	if (data) {
		return Response.json(data);
	} else return error;
}

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ questionId: string }> },
) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const { questionId } = await params;

	const quizId = await getQuizIdForQuestion(questionId);
	if (!quizId) return Response.json({ error: 'Question not found' }, { status: 404 });

	const activeError = await assertQuizNotActive(quizId);
	if (activeError) return activeError;

	const questionData: QuestionUpdate = await request.json();

	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('question')
				.update({
					title: questionData.title,
					answer1: questionData.answer1,
					answer2: questionData.answer2,
					answer3: questionData.answer3,
					answer4: questionData.answer4,
					good_answer: questionData.goodAnswer,
					...(questionData.points !== undefined && { points: questionData.points }),
				})
				.eq('id', questionId)
				.select(),
	);

	if (data) {
		return Response.json({ id: data[0].id });
	} else return error;
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ questionId: string }> },
) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const { questionId } = await params;

	const quizId = await getQuizIdForQuestion(questionId);
	if (!quizId) return Response.json({ error: 'Question not found' }, { status: 404 });

	const activeError = await assertQuizNotActive(quizId);
	if (activeError) return activeError;

	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('question')
				.update({ deleted_at: new Date() })
				.eq('id', questionId)
				.select(),
	);

	if (data) {
		return Response.json({});
	} else return error;
}
