import { createClient } from '@supabase/supabase-js';
import { runQuery } from '../../../../../utils/runQuery';
import { checkAuth } from '../../../../../utils/checkAuth';

interface Quiz {
	title: string;
	description: string;
	answer1: string;
	answer2: string;
	answer3: string;
	answer4: string;
	goodAnswer: number;
}

const supabase = createClient(
	`https://${process.env.SUPABASE_ID}.supabase.co`,
	process.env.SUPABASE_KEY!,
);

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
	await checkAuth(request, supabase);

	const questionData: Quiz = await request.json();
	const { questionId } = await params;

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
				})
				.eq('id', questionId)
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
	{ params }: { params: Promise<{ questionId: string }> },
) {
	await checkAuth(request, supabase);

	const { questionId } = await params;

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
