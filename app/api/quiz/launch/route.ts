import { VercelRequest, VercelResponse } from '@vercel/node';

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
	`https://${process.env.SUPABASE_ID}.supabase.co`,
	process.env.SUPABASE_KEY!,
);

export async function POST(request: VercelRequest, response: VercelResponse) {
	// auth by header, get stream name, and quiz config

	// Get quiz from id

	// Join a room/topic. Can be anything except for 'realtime'.
	const myChannel = supabase.channel(`quickiz.${process.env.CHANNEL}`);
	await myChannel.send({
		type: 'broadcast',
		event: 'quiz-state',
		payload: { message: 'Hi' },
	});

	return new Response(
		JSON.stringify({
			message: 'ok',
		}),
	);
}
