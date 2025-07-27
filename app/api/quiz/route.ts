import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface Quiz {
	title: string;
	channel_id: string;
}

const supabase = createClient(
	`https://${process.env.SUPABASE_ID}.supabase.co`,
	process.env.SUPABASE_KEY!,
);

async function checkAuth(request: VercelRequest): Promise<boolean> {
	return true;
	const authHeader = request.headers.authorization;
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

export async function GET(request: VercelRequest, response: VercelResponse) {
	const isAuthenticated = await checkAuth(request);
	if (!isAuthenticated) {
		return response.status(401).json({ error: 'Unauthorized' });
	}

	// try {
	// 	const quizData: Quiz = request.body;
	//
	// 	if (!quizData.title || !quizData.channel_id) {
	// 		return response.status(400).json({ error: 'Missing required fields' });
	// 	}
	//
	// 	const { data: quiz, error } = await supabase
	// 		.from('quiz')
	// 		.insert({ title: quizData.title, channel_id: quizData.channel_id })
	// 		.select()
	// 		.single();
	//
	// 	if (error) {
	// 		return response.status(500).json({ error: error.message });
	// 	}
	//
	// 	return response.status(201).json({ quiz_id: quiz.id });
	// } catch (error) {
	// 	return response.status(500).json({ error: 'Internal server error' });
	// }

	return Response.json({
		status: 'ok',
	});
}

const ALLOWED_ORIGIN = process.env.NODE_ENV === 'production' ? 'https://app.example' : '*';

export async function OPTIONS() {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Allow-Credentials': 'true',
		},
	});
}
