import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
import {
	R2_ACCOUNT_ID,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_BUCKET_NAME,
	R2_PUBLIC_URL
} from '$env/static/private';

const r2 = new S3Client({
	region: 'auto',
	endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY
	}
});

export async function createPresignedUploadUrl(
	filename: string,
	contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
	const ext = filename.split('.').pop() ?? 'bin';
	const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

	const command = new PutObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: key,
	});

	const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
	const publicUrl = `${R2_PUBLIC_URL}/${key}`;

	return { uploadUrl, publicUrl };
}

const EXT_MAP: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png':  'png',
	'image/webp': 'webp',
	'image/gif':  'gif',
};

/**
 * Google 아바타 URL에서 이미지를 fetch해 SHA-256 해시 기반 키로 R2에 저장합니다.
 * 동일 해시 파일이 이미 존재하면 업로드를 건너뜁니다.
 * 실패 시 원본 Google URL을 반환합니다.
 */
export async function uploadAvatarToR2(imageUrl: string): Promise<string> {
	try {
		const res = await fetch(imageUrl);
		if (!res.ok) return imageUrl;

		const buffer = Buffer.from(await res.arrayBuffer());
		const contentType = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0].trim();
		const ext = EXT_MAP[contentType] ?? 'jpg';
		const hash = createHash('sha256').update(buffer).digest('hex');
		const key = `avatars/${hash}.${ext}`;

		// 이미 존재하면 재업로드 없이 URL 반환
		try {
			await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
			return `${R2_PUBLIC_URL}/${key}`;
		} catch {
			// 존재하지 않으면 업로드 진행
		}

		await r2.send(new PutObjectCommand({
			Bucket: R2_BUCKET_NAME,
			Key: key,
			Body: buffer,
			ContentType: contentType,
		}));

		return `${R2_PUBLIC_URL}/${key}`;
	} catch (err) {
		console.error('[r2] uploadAvatarToR2 failed:', err);
		return imageUrl; // 실패 시 원본 URL 사용
	}
}
