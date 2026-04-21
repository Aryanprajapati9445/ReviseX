import { S3Client } from '@aws-sdk/client-s3';

if (!process.env.AWS_S3_BUCKET) {
    console.warn('⚠️  AWS_S3_BUCKET is not set. File uploads will be disabled.');
}

// ── Credential strategy ───────────────────────────────────────────────
// Local dev : set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in .env
// EC2 prod  : attach an IAM Role — leave the key vars blank/absent,
//             the SDK will automatically use the instance metadata service.
const clientConfig = {
    region: process.env.AWS_REGION || 'ap-south-1',
};

// Only pass explicit credentials when both are present (local dev).
// On EC2 with an IAM Role, omitting `credentials` lets the SDK use the role.
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
}

const s3Client = new S3Client(clientConfig);

export const BUCKET_NAME = process.env.AWS_S3_BUCKET || '';

export default s3Client;
