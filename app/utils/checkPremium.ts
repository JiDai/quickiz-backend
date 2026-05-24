import supabase from './supabase';

export async function checkPremium(channelId: string): Promise<boolean> {
	const { data } = await supabase
		.from('streamer')
		.select('is_premium')
		.eq('id', channelId)
		.single();
	return data?.is_premium === true;
}
