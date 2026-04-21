/**
 * Phase 2A — CloudFront signed URL generator.
 *
 * Generates short-lived signed URLs for reading private files.
 *
 * Strategy:
 *   - If CLOUDFRONT_DOMAIN + CLOUDFRONT_KEY_PAIR_ID + CLOUDFRONT_PRIVATE_KEY
 *     are all set → issue a CloudFront signed URL (fastest, most scalable).
 *   - Otherwise → fall back to an S3 presigned URL (works out of the box,
 *     bypasses CDN caching but fully functional).
 *
 * CloudFront setup prerequisites:
 *   1. CloudFront distribution pointing to your S3 bucket via OAC
 *   2. A CloudFront key group + public key configured in the distribution
 *   3. CLOUDFRONT_PRIVATE_KEY stored as a base64-encoded RSA PEM secret
 *
 * Never return direct S3 URLs to the frontend — always use this helper.
 */

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as s3PresignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client } from '@aws-sdk/client-s3';

/** Returns true when all required CloudFront env vars are set. */
export function isCloudFrontConfigured() {
    return !!(
        process.env.CLOUDFRONT_DOMAIN &&
        process.env.CLOUDFRONT_KEY_PAIR_ID &&
        process.env.CLOUDFRONT_PRIVATE_KEY
    );
}

/**
 * Returns a signed read URL for a file stored in S3.
 * Uses CloudFront if configured, otherwise falls back to S3 presigned URL.
 *
 * @param {string} fileKey      S3 object key (e.g. "uploads/notes/docs/uuid.pdf")
 * @param {string} [mimeType]   MIME type for ResponseContentType header
 * @param {string} [fileName]   Original filename for Content-Disposition header
 * @param {boolean} [download]  true → attachment disposition, false → inline
 * @param {number}  [ttl]       Lifetime in seconds (default from env or 900)
 * @returns {Promise<string>}   Signed URL
 */
export async function getSignedReadUrl(fileKey, {
    mimeType  = 'application/octet-stream',
    fileName  = '',
    download  = false,
    ttl       = Number(process.env.SIGNED_URL_READ_TTL_SECONDS || 900),
} = {}) {
    if (isCloudFrontConfigured()) {
        return _cloudFrontSignedUrl(fileKey, ttl);
    }
    return _s3PresignedUrl(fileKey, { mimeType, fileName, download, ttl });
}

// ─── CloudFront path ─────────────────────────────────────────────────────────

/**
 * Issues a CloudFront signed URL using the RSA private key from environment.
 * The private key must be stored base64-encoded in CLOUDFRONT_PRIVATE_KEY.
 *
 * @param {string} fileKey
 * @param {number} ttl
 * @returns {string}
 */
async function _cloudFrontSignedUrl(fileKey, ttl) {
    // Lazy-import: @aws-sdk/cloudfront-signer is optional and only needed
    // when CloudFront is configured. This avoids a hard dependency.
    let getSignedUrl;
    try {
        ({ getSignedUrl } = await import('@aws-sdk/cloudfront-signer'));
    } catch {
        console.warn('⚠️  @aws-sdk/cloudfront-signer not installed. Falling back to S3 presigned URL.');
        return _s3PresignedUrl(fileKey, { ttl });
    }

    const privateKey = Buffer.from(process.env.CLOUDFRONT_PRIVATE_KEY, 'base64').toString('utf-8');

    return getSignedUrl({
        url:          `https://${process.env.CLOUDFRONT_DOMAIN}/${fileKey}`,
        keyPairId:    process.env.CLOUDFRONT_KEY_PAIR_ID,
        privateKey,
        dateLessThan: new Date(Date.now() + ttl * 1000).toISOString(),
    });
}

// ─── S3 Presigned URL fallback ────────────────────────────────────────────────

/**
 * Issues a short-lived S3 presigned GET URL.
 * Used when CloudFront is not configured.
 *
 * @param {string} fileKey
 * @param {object} opts
 */
async function _s3PresignedUrl(fileKey, { mimeType, fileName, download, ttl = 900 } = {}) {
    const s3 = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
            accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });

    const safeFileName = encodeURIComponent(fileName || fileKey.split('/').pop() || 'download');
    const disposition  = download
        ? `attachment; filename="${safeFileName}"`
        : `inline; filename="${safeFileName}"`;

    const command = new GetObjectCommand({
        Bucket:                     process.env.AWS_S3_BUCKET,
        Key:                        fileKey,
        ResponseContentType:        mimeType || 'application/octet-stream',
        ResponseContentDisposition: disposition,
    });

    return s3PresignedUrl(s3, command, { expiresIn: ttl });
}
