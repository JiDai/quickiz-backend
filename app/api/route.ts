import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	`https://${process.env.SUPABASE_ID}.supabase.co`,
	process.env.SUPABASE_KEY!,
);

import { VercelRequest, VercelResponse } from '@vercel/node';

export async function GET(request: VercelRequest, response: VercelResponse) {
	const channels = supabase.getChannels();

	// auth by header, get stream name, and quiz config

	// Join a room/topic. Can be anything except for 'realtime'.
	const myChannel = supabase.channel(`quickiz.${process.env.CHANNEL}`);

	// Subscribe to the Channel
	await myChannel.send({
		type: 'broadcast',
		event: 'shout',
		payload: { message: 'Hi' },
	});

	return new Response(
		JSON.stringify({
			message: 'ok',
		}),
	);
}
