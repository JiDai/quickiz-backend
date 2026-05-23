import { PostgrestMaybeSingleResponse } from '@supabase/supabase-js';

export async function runQuery<T>(
	query: () => Promise<PostgrestMaybeSingleResponse<T>>,
): Promise<[T, null] | [null, Response]> {
	try {
		const { data, error } = await query();

		if (error) {
			console.log(`ERROR: `, error);
			return [null, Response.json({ error: error.message }, { status: 500 })];
		}
		return [data as T, null];
	} catch (err) {
		console.log(`ERROR: `, err);
		return [null, Response.json({ error: (err as Error).message }, { status: 500 })];
	}
}
