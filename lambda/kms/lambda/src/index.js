import { uploadEncrypted, downloadDecrypted } from './s3Utils.js';

export const handler = async (event) => {
  const path = event.path || event.requestContext?.http?.path;
  const method = event.httpMethod || event.requestContext?.http?.method;
  try {
    if (path === '/upload' && method === 'POST') {
      const { key, content } = JSON.parse(event.body);
      const res = await uploadEncrypted({ data: Buffer.from(content), s3Key: key });
      return { statusCode: 200, body: JSON.stringify({ message: 'Success', loc: res.Location }) };
    }
    if (path === '/download' && method === 'GET') {
      const key = event.queryStringParameters?.key;
      const { plaintext, encryptionContext } = await downloadDecrypted({ s3Key: key });
      return { statusCode: 200, body: JSON.stringify({ content: plaintext.toString(), encryptionContext }) };
    }
    return { statusCode: 404, body: 'Not Found' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
