import { createClient } from '@supabase/supabase-js';
import { runQuery } from '../../../utils/runQuery';
import { checkAuth } from '../../../utils/checkAuth';

interface Quiz {
	title: string;
	description: string;
	channel_id: string;
}

const supabase = createClient(
	`https://${process.env.SUPABASE_ID}.supabase.co`,
	process.env.SUPABASE_KEY!,
);

export async function GET(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
	await checkAuth(request, supabase);

	const { quizId } = await params;

	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('quiz')
				.select('*, questions:question!quiz_id(*)')
				.eq('id', quizId)
				.single(),
	);

	if (data) {
		return Response.json(data);
	} else return error;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
	await checkAuth(request, supabase);

	const quizData: Quiz = await request.json();
	const { quizId } = await params;

	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('quiz')
				.update({ title: quizData.title, description: quizData.description })
				.eq('id', quizId)
				.select(),
	);

	if (data) {
		return Response.json({
			id: data[0].id,
		});
	} else return error;
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ quizId: string }> },
) {
	await checkAuth(request, supabase);

	const { quizId } = await params;

	const [data, error] = await runQuery(
		async () =>
			await supabase.from('quiz').update({ deleted_at: new Date() }).eq('id', quizId).select(),
	);

	if (data) {
		return Response.json({});
	} else return error;
}
