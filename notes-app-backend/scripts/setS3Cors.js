/**
 * Sets the CORS configuration on the S3 bucket so browsers can
 * PUT files directly via presigned URLs.
 *
 * Run once:
 *   node scripts/setS3Cors.js
 *
 * Required env vars:
 *   AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */

import 'dotenv/config';
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const corsConfig = {
    CORSRules: [
        {
            /**
             * Allow browsers to PUT files directly to S3 via presigned URLs.
             * Restrict AllowedOrigins in production to your actual domain.
             */
            AllowedOrigins: [
                'http://localhost:5173',
                'http://localhost:3000',
                ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
            ],
            AllowedMethods: ['PUT', 'GET', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders:  ['ETag'],        // ETag is required for multipart uploads
            MaxAgeSeconds:  3600,
        },
    ],
};

try {
    await s3.send(new PutBucketCorsCommand({
        Bucket:            process.env.AWS_S3_BUCKET,
        CORSConfiguration: corsConfig,
    }));
    console.log(`✅ CORS configured on bucket: ${process.env.AWS_S3_BUCKET}`);
    console.log('   AllowedOrigins:', corsConfig.CORSRules[0].AllowedOrigins);
} catch (err) {
    console.error('❌ Failed to set CORS:', err.message);
    process.exit(1);
}
