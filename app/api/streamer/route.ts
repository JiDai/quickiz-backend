import { checkAuth } from '../../utils/checkAuth';
import supabase from '../../utils/supabase';

export async function GET(request: Request) {
	const auth = await checkAuth(request);
	if (auth instanceof Response) {
		return auth;
	}

	const { data, error } = await supabase
		.from('streamer')
		.upsert({ id: auth.channelId }, { onConflict: 'id', ignoreDuplicates: true })
		.select('is_premium')
		.single();

	if (error) {
		// If upsert failed, try a plain select (race condition safe)
		const { data: existing } = await supabase
			.from('streamer')
			.select('is_premium')
			.eq('id', auth.channelId)
			.single();
		return Response.json({ is_premium: existing?.is_premium ?? false });
	}

	return Response.json({ is_premium: data?.is_premium ?? false });
}
