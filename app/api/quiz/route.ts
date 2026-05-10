import { checkAuth } from '../../utils/checkAuth';
import { runQuery } from '../../utils/runQuery';
import supabase from '../../utils/supabase';

interface Quiz {
	title: string;
}

export async function GET(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('quiz')
				.select('*, questions:question!quiz_id(*)')
				.eq('streamer_id', auth.channelId)
				.is('deleted_at', null)
				.order('created_at', { ascending: false }),
	);

	if (data) {
		return Response.json(data);
	} else return error;
}

export async function POST(request: Request, response: Response) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const quizData: Quiz = await request.json();
	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('quiz')
				.insert({ title: quizData.title, streamer_id: auth.channelId })
				.select(),
	);

	if (data) {
		return Response.json({ id: data[0].id });
	} else return error;
}
