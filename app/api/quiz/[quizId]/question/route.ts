import { checkAuth } from '../../../../utils/checkAuth';
import { assertQuizNotActive } from '../../../../utils/assertQuizNotActive';
import { QuestionRequest } from '../../../../types/questionRequest';
import { runQuery } from '../../../../utils/runQuery';
import supabase from '../../../../utils/supabase';

export async function POST(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) {
		return auth;
	}

	const { quizId } = await params;

	const activeError = await assertQuizNotActive(quizId);
	if (activeError) {
		return activeError;
	}

	// Ownership check — prevent a streamer from adding questions to another streamer's quiz.
	const { data: ownedQuiz } = await supabase
		.from('quiz')
		.select('id')
		.eq('id', quizId)
		.eq('streamer_id', auth.channelId)
		.single();
	if (!ownedQuiz) {
		return Response.json({ error: 'Unauthorized' }, { status: 403 });
	}

	const body: QuestionRequest = await request.json();

	const { data: existing } = await supabase
		.from('question')
		.select('position')
		.eq('quiz_id', quizId)
		.is('deleted_at', null)
		.order('position', { ascending: false })
		.limit(1);
	const nextPosition = (existing?.[0]?.position ?? 0) + 1;

	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('question')
				.insert({
					title: body.title,
					answer1: body.answer1,
					answer2: body.answer2,
					answer3: body.answer3,
					answer4: body.answer4,
					good_answer: body.goodAnswer,
					quiz_id: quizId,
					position: nextPosition,
					points: body.points ?? 1,
				})
				.select(),
	);

	if (data) {
		return Response.json({ id: data[0].id });
	} else {
		return error;
	}
}
