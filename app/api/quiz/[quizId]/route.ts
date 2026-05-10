import { checkAuth } from '../../../utils/checkAuth';
import { assertQuizNotActive } from '../../../utils/assertQuizNotActive';
import { runQuery } from '../../../utils/runQuery';
import supabase from '../../../utils/supabase';

interface Quiz {
	title: string;
	description: string;
}

export async function GET(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const { quizId } = await params;

	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('quiz')
				.select('*, questions:question!quiz_id(*)')
				.eq('id', quizId)
				.eq('streamer_id', auth.channelId)
				.single(),
	);

	if (data) {
		return Response.json(data);
	} else return error;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const { quizId } = await params;

	const activeError = await assertQuizNotActive(quizId);
	if (activeError) return activeError;

	const quizData: Quiz = await request.json();

	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('quiz')
				.update({ title: quizData.title, description: quizData.description })
				.eq('id', quizId)
				.eq('streamer_id', auth.channelId)
				.select(),
	);

	if (data) {
		return Response.json({ id: data[0].id });
	} else return error;
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ quizId: string }> },
) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const { quizId } = await params;

	const activeError = await assertQuizNotActive(quizId);
	if (activeError) return activeError;

	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('quiz')
				.update({ deleted_at: new Date() })
				.eq('id', quizId)
				.eq('streamer_id', auth.channelId)
				.select(),
	);

	if (data) {
		return Response.json({});
	} else return error;
}
