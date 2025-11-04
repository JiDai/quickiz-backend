export async function checkAuth(request: Request, supabase): Promise<boolean> {
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
