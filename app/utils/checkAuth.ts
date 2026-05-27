import { createHmac } from 'crypto';

export type AuthResult = Response | { channelId: string; viewerOpaqueId: string };

export async function checkAuth(request: Request): Promise<AuthResult> {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const token = authHeader.replace('Bearer ', '');

	if (process.env.TWITCH_MOCK === 'true' && token === 'dev-token') {
		return { channelId: 'dev-channel', viewerOpaqueId: 'dev-viewer' };
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

	// opaque_user_id is always present in Twitch Extension JWTs — it is a
	// Twitch-issued identifier that cannot be forged by the client.
	return { channelId: payload.channel_id, viewerOpaqueId: payload.opaque_user_id as string };
}
