import { checkAuth } from '../../../../utils/checkAuth';
import supabase from '../../../../utils/supabase';

export async function DELETE(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) return auth;

	const { quizId } = await params;

	const { data: quiz } = await supabase
		.from('quiz')
		.select('id')
		.eq('id', quizId)
		.eq('streamer_id', auth.channelId)
		.single();

	if (!quiz) return Response.json({ error: 'Quiz not found' }, { status: 404 });

	const { data: questions } = await supabase
		.from('question')
		.select('id')
		.eq('quiz_id', quizId)
		.is('deleted_at', null);

	if (!questions?.length) return Response.json({});

	const questionIds = questions.map((q) => q.id);

	const { error } = await supabase
		.from('viewer_answer')
		.delete()
		.in('question_id', questionIds);

	if (error) return Response.json({ error: error.message }, { status: 500 });

	return Response.json({});
}
