import { checkAuth } from '../../../utils/checkAuth';
import supabase from '../../../utils/supabase';

type Body = {
	questionId: string;
	answer: number;
	viewerId: string;
	viewerName: string;
};

export async function POST(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) {
		return auth;
	}

	const { questionId, answer, viewerId, viewerName }: Body = await request.json();

	await supabase.from('viewer_answer').insert({
		question_id: questionId,
		answer,
		viewer_id: viewerId,
		viewer_name: viewerName,
	});

	return Response.json({ message: 'ok' });
}
