import supabase from './supabase';

export async function assertQuizNotActive(quizId: string): Promise<Response | null> {
	const { data } = await supabase.from('quiz').select('active').eq('id', quizId).single();
	if (data?.active) {
		return Response.json({ error: 'Quiz is currently active' }, { status: 403 });
	}
	return null;
}
