import { checkAuth } from '../../../utils/checkAuth';
import supabase from '../../../utils/supabase';

export async function POST(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const body: { stateName: string; stateData: unknown } = await request.json();
	const { stateName, stateData } = body;

	const channel = supabase.channel(`quickiz.${auth.channelId}`);
	await channel.send({
		type: 'broadcast',
		event: 'quiz-state',
		payload: { stateName, stateData },
	});

	return Response.json({ message: 'ok' });
}
