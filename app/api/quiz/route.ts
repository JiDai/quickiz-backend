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

export async function GET(request: Request, response: Response) {
	try {
		const { data, error, status } = await supabase.from('quiz').select().order('created_at', {
			ascending: false,
		});

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

export async function POST(request: Request, response: Response) {
	const isAuthenticated = await checkAuth(request);
	if (!isAuthenticated) {
		return Response.json(
			{
				error: 'Missing auth',
			},
			{ status: 400 },
		);
	}

	try {
		const quizData: Quiz = await request.json();

		if (!quizData.title) {
			return Response.json(
				{
					error: 'Missing required fields',
				},
				{ status: 400 },
			);
		}

		const { data, error, status } = await supabase
			.from('quiz')
			.insert({ title: quizData.title })
			.select();

		if (error) {
			console.log(`ERROR: `, error);
			return Response.json(
				{
					error: error.message,
				},
				{ status: 500 },
			);
		}
		return Response.json({
			id: data[0].id,
		});
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
