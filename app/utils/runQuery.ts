import {
	PostgrestMaybeSingleResponse,
	PostgrestResponse,
	PostgrestSingleResponse,
} from '@supabase/supabase-js';

export async function runQuery<T extends any>(
	query: () => Promise<PostgrestMaybeSingleResponse<T>>,
) {
	try {
		const { data, error } = await query();

		if (error) {
			console.log(`ERROR: `, error);
			return [
				null,
				Response.json(
					{
						error: error.message,
					},
					{ status: 500 },
				),
			];
		}
		return [data || {}];
	} catch (error) {
		console.log(`ERROR: `, error);
		return [
			null,
			Response.json(
				{
					error: error.message,
				},
				{ status: 500 },
			),
		];
	}
}
