import { createHmac } from 'crypto';

type AuthResult = Response | { channelId: string };

export async function checkAuth(request: Request): Promise<AuthResult> {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const token = authHeader.replace('Bearer ', '');

	if (process.env.TWITCH_MOCK === 'true' && token === 'dev-token') {
		return { channelId: 'dev-channel' };
	}

	const parts = token.split('.');
	if (parts.length !== 3) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const [headerB64, payloadB64, signatureB64] = parts;
	const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET!, 'base64');
	const expectedSig = createHmac('sha256', secret)
		.update(`${headerB64}.${payloadB64}`)
		.digest('base64url');

	if (expectedSig !== signatureB64) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
	if (!payload.exp || payload.exp < Date.now() / 1000) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 });
	}

	return { channelId: payload.channel_id };
}
