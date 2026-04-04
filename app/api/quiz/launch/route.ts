import { VercelRequest, VercelResponse } from '@vercel/node';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	`https://${process.env.SUPABASE_ID}.supabase.co`,
	process.env.SUPABASE_KEY!,
);

export async function POST(request: Request) {
	const body: { stateName: string; stateData: unknown } = await request.json();
	const { stateName, stateData } = body;

	const myChannel = supabase.channel(`quickiz.${process.env.CHANNEL}`);
	await myChannel.send({
		type: 'broadcast',
		event: 'quiz-state',
		payload: { stateName, stateData },
	});

	return Response.json({ message: 'ok' });
}
