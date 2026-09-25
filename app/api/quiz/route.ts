import { checkAuth } from '../../utils/checkAuth';
import { checkPremium } from '../../utils/checkPremium';
import { runQuery } from '../../utils/runQuery';
import supabase from '../../utils/supabase';

type ScoringType = 'correct_count' | 'time_bonus' | 'weighted';

interface Quiz {
	title: string;
	scoring_type?: ScoringType;
	timer_duration?: number;
}

export async function GET(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) {
		return auth;
	}

	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('quiz')
				.select('*, questions:question!quiz_id(*)')
				.eq('streamer_id', auth.channelId)
				.is('deleted_at', null)
				// Soft-deleted questions must never reach live-config: launching one makes
				// /api/quiz/state (which excludes them) resolve to IDLE for viewers.
				.is('questions.deleted_at', null)
				.order('created_at', { ascending: false }),
	);

	if (error) {
		return error;
	}

	const sorted = data!.map((quiz) => ({
		...quiz,
		questions: [...(quiz.questions ?? [])].sort((a, b) => a.position - b.position),
	}));
	return Response.json(sorted);
}

export async function POST(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) {
		return auth;
	}

	const quizData: Quiz = await request.json();
	const scoringType: ScoringType = quizData.scoring_type ?? 'correct_count';

	if (scoringType !== 'correct_count') {
		const isPremium = await checkPremium(auth.channelId);
		if (!isPremium) {
			return Response.json({ error: 'Premium required for this scoring type' }, { status: 403 });
		}
	}

	const [data, error] = await runQuery(
		async () =>
			await supabase
				.from('quiz')
				.insert({
					title: quizData.title,
					streamer_id: auth.channelId,
					scoring_type: scoringType,
					timer_duration: quizData.timer_duration ?? 30,
				})
				.select(),
	);

	if (error) {
		return error;
	}
	return Response.json({ id: data![0].id });
}
