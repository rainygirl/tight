import { json, error } from '@sveltejs/kit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = env;
import type { RequestHandler } from './$types';

const r2 = new S3Client({
	region: 'auto',
	endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY
	}
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	if (!file) error(400, 'No file');
	if (!file.type.startsWith('image/')) error(400, 'Images only');

	const buffer = Buffer.from(await file.arrayBuffer());
	const ext = file.name.split('.').pop() ?? 'bin';
	const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

	await r2.send(new PutObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: key,
		Body: buffer,
		ContentType: file.type,
	}));

	return json({ publicUrl: `${R2_PUBLIC_URL}/${key}` });
};
