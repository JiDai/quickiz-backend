import { createClient } from '@supabase/supabase-js';
import { runQuery } from '../../utils/runQuery';
import { checkAuth } from '../../utils/checkAuth';

interface Quiz {
	title: string;
	channel_id: string;
}

const supabase = createClient(
	`https://${process.env.SUPABASE_ID}.supabase.co`,
	process.env.SUPABASE_KEY!,
);

export async function GET() {
	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('quiz')
				.select('*, questions:question!quiz_id(*)')
				.is('deleted_at', null)
				.order('created_at', {
					ascending: false,
				}),
	);

	if (data) {
		return Response.json(data);
	} else return error;
}

export async function POST(request: Request, response: Response) {
	await checkAuth(request, supabase);

	const quizData: Quiz = await request.json();
	const [data, error] = await runQuery(
		async () => await supabase.from('quiz').insert({ title: quizData.title }).select(),
	);

	if (data) {
		return Response.json({
			id: data[0].id,
		});
	} else return error;
}
