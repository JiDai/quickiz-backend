import supabase from './supabase';

export async function assertQuizNotActive(quizId: string): Promise<Response | null> {
	const { data } = await supabase.from('quiz').select('state').eq('id', quizId).single();
	if (data?.state !== 'idle') {
		return Response.json({ error: 'Quiz is currently active' }, { status: 403 });
	}
	return null;
}
