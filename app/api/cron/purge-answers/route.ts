import supabase from '../../../utils/supabase';

// Matches the retention duration announced in the extension's Terms of Service.
const RETENTION_DAYS = 365;

export async function GET(request: Request) {
	const authHeader = request.headers.get('authorization');
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

	const { error, count } = await supabase
		.from('viewer_answer')
		.delete({ count: 'exact' })
		.lt('created_at', cutoff);

	if (error) {
		console.error('[cron] purge-answers error:', error);
		return Response.json({ error: error.message }, { status: 500 });
	}

	return Response.json({ deleted: count ?? 0 });
}
