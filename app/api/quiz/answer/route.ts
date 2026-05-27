import { checkAuth } from '../../../utils/checkAuth';
import supabase from '../../../utils/supabase';

type Body = {
	questionId: string;
	answer: number;
	viewerName: string;
	// viewerId is intentionally NOT accepted from the client — we use the
	// Twitch-signed opaque_user_id from the JWT instead.
};

export async function POST(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	// Identity comes from the Twitch JWT — cannot be spoofed by the client.
	const { channelId, viewerOpaqueId } = auth;

	const { questionId, answer, viewerName }: Body = await request.json();

	// 1. Validate the question exists and is currently running.
	const { data: question } = await supabase
		.from('question')
		.select('state, quiz_id')
		.eq('id', questionId)
		.single();

	if (!question || question.state !== 'running') {
		return Response.json({ error: 'Question is not active' }, { status: 403 });
	}

	// 2. Validate the question belongs to this channel's quiz (prevents cross-channel stuffing).
	const { data: quiz } = await supabase
		.from('quiz')
		.select('id')
		.eq('id', question.quiz_id)
		.eq('streamer_id', channelId)
		.single();

	if (!quiz) {
		return Response.json({ error: 'Unauthorized' }, { status: 403 });
	}

	// 3. Reject duplicate answers — first answer counts, no retry-until-correct.
	const { data: existing } = await supabase
		.from('viewer_answer')
		.select('id')
		.eq('question_id', questionId)
		.eq('viewer_id', viewerOpaqueId)
		.maybeSingle();

	if (existing) {
		return Response.json({ message: 'already answered' });
	}

	// 4. Insert with the verified viewer identity.
	await supabase.from('viewer_answer').insert({
		question_id: questionId,
		answer,
		viewer_id: viewerOpaqueId,
		viewer_name: viewerName,
	});

	return Response.json({ message: 'ok' });
}
