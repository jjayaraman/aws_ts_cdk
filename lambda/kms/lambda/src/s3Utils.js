import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { encryptBuffer, decryptBuffer } from './kmsUtils.js';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-2',
  endpoint: process.env.AWS_ENDPOINT_URL || undefined,
  forcePathStyle: !!process.env.AWS_ENDPOINT_URL, // Path style is required for LocalStack S3
});

export async function uploadEncrypted({ data, s3Key, bucket = process.env.S3_BUCKET }) {
  const ciphertext = await encryptBuffer({ data, encryptionContext: { bucket, s3Key } });
  const upload = new Upload({ client: s3Client, params: { Bucket: bucket, Key: s3Key, Body: ciphertext } });
  return await upload.done();
}

export async function downloadDecrypted({ s3Key, bucket = process.env.S3_BUCKET }) {
  const resp = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: s3Key }));
  const chunks = [];
  for await (const chunk of resp.Body) chunks.push(chunk);
  const { plaintext, encryptionContext } = await decryptBuffer({ ciphertext: Buffer.concat(chunks) });
  return { plaintext, encryptionContext };
}
