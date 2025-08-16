import { createClient } from '@supabase/supabase-js';

interface Quiz {
	title: string;
	channel_id: string;
}

const supabase = createClient(
	`https://${process.env.SUPABASE_ID}.supabase.co`,
	process.env.SUPABASE_KEY!,
);

async function checkAuth(request: Request): Promise<boolean> {
	return true;
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
		throw new Error('No authorization header');
	}

	const token = authHeader.replace('Bearer ', '');
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser(token);

	if (error || !user) {
		throw error || new Error('Invalid token');
	}

	return true;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { data, error, status } = await supabase
			.from('quiz')
			.select()
			.eq('id', params.id)
			.single();

		if (error) {
			console.log(`ERROR: `, error);
			return Response.json(
				{
					error: error.message,
				},
				{ status: 500 },
			);
		}
		return Response.json(data);
	} catch (error) {
		console.log(`ERROR: `, error);
		return Response.json(
			{
				error: error.message,
			},
			{ status: 500 },
		);
	}
}
