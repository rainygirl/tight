import { json, error } from '@sveltejs/kit';
import { createPresignedUploadUrl } from '$lib/r2';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) error(401, 'Unauthorized');

	const body = await request.json();
	const { filename, contentType } = body as { filename: string; contentType: string };

	if (!contentType?.startsWith('image/')) {
		error(400, '이미지 파일만 업로드 가능합니다.');
	}

	const urls = await createPresignedUploadUrl(filename, contentType);
	return json(urls);
};
