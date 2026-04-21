/**
 * Test script — verifies whether file reads use CloudFront or S3.
 *
 * Usage:
 *   node scripts/testCloudFront.js <noteId>
 *
 * Example:
 *   node scripts/testCloudFront.js abc-123
 */
import 'dotenv/config';
import { isCloudFrontConfigured } from '../lib/cloudfront.js';
import { getSignedReadUrl }       from '../lib/cloudfront.js';

// ─── Check env vars ───────────────────────────────────────────────────────────
console.log('\n🔍 CloudFront Configuration Check');
console.log('──────────────────────────────────────');

const checks = [
  { key: 'CLOUDFRONT_DOMAIN',       label: 'Domain',      val: process.env.CLOUDFRONT_DOMAIN       },
  { key: 'CLOUDFRONT_KEY_PAIR_ID',  label: 'Key Pair ID', val: process.env.CLOUDFRONT_KEY_PAIR_ID  },
  { key: 'CLOUDFRONT_PRIVATE_KEY',  label: 'Private Key', val: process.env.CLOUDFRONT_PRIVATE_KEY  },
];

let allSet = true;
for (const c of checks) {
  const ok = !!c.val && c.val.trim().length > 0;
  if (!ok) allSet = false;
  console.log(`  ${ok ? '✅' : '❌'} ${c.label.padEnd(14)} ${ok ? (c.key === 'CLOUDFRONT_PRIVATE_KEY' ? '<set>' : c.val) : '(not set)'}`);
}

console.log('──────────────────────────────────────');
console.log(`  Active mode: ${isCloudFrontConfigured() ? '☁️  CloudFront' : '🪣  S3 Presigned URL (fallback)'}\n`);

if (!allSet) {
  console.log('⚠️  Set missing env vars in .env to activate CloudFront.\n');
  process.exit(0);
}

// ─── Generate a test signed URL ───────────────────────────────────────────────
// Use a real fileKey from your DB, or just test with a dummy key to check URL format.
const testKey = process.argv[2] || 'uploads/notes/docs/example.pdf';

console.log(`🔑 Generating signed URL for key: ${testKey}`);

try {
  const url = await getSignedReadUrl(testKey, {
    mimeType: 'application/pdf',
    fileName: 'test.pdf',
    ttl:      60,
  });

  console.log('\n✅ Signed URL generated successfully!');
  console.log('──────────────────────────────────────');

  const isCloudFront = url.includes(process.env.CLOUDFRONT_DOMAIN);
  const isS3         = url.includes('s3.amazonaws.com') || url.includes('s3.ap-south-1.amazonaws.com');

  console.log(`  URL starts with: ${url.substring(0, 80)}...`);
  console.log(`  Source:          ${isCloudFront ? '☁️  CloudFront ✅' : isS3 ? '🪣  S3 (CloudFront not active)' : '❓ Unknown'}`);
  console.log(`  Has Policy/Sig:  ${url.includes('Policy=') || url.includes('Signature=') || url.includes('X-Amz-Signature=') ? 'Yes ✅' : 'No ❌'}`);
  console.log(`  Expires in:      60 seconds (test TTL)\n`);

  if (isCloudFront) {
    console.log('🎉 CloudFront is active! Files serve from CDN edge nodes near your users.\n');
    console.log('📌 To confirm a direct S3 URL is blocked, try opening this in a browser:');
    console.log(`   https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${testKey}`);
    console.log('   → Expected: 403 AccessDenied (S3 locked down ✅)');
  }

} catch (err) {
  console.error('\n❌ Failed to generate signed URL:', err.message);
  if (err.message.includes('PEM')) {
    console.error('   → CLOUDFRONT_PRIVATE_KEY is malformed. Re-encode it with base64.');
  }
}
