import { checkAuth } from '../../../utils/checkAuth';
import { getQuizState } from '../../../utils/quizState';

/**
 * Returns the current quiz state for a streamer's channel so viewers who join
 * mid-session land on the right screen without waiting for the next broadcast.
 *
 * Reads quiz.state directly — the single source of truth for the session state.
 */
export async function GET(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) {
		return auth;
	}

	try {
		return Response.json(await getQuizState(auth.channelId));
	} catch (error) {
		console.error('[/api/quiz/state] Supabase error:', error);
		return Response.json({ error: (error as Error).message }, { status: 500 });
	}
}
