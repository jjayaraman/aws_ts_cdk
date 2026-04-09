/**
 * kmsUtils.js
 * KMS envelope encryption / decryption utilities using @aws-crypto/client-node.
 */

import {
  buildClient,
  CommitmentPolicy,
  KmsKeyringNode,
} from '@aws-crypto/client-node';
import { KMSClient } from '@aws-sdk/client-kms';

const REGION = process.env.AWS_REGION || 'eu-west-2';
const KMS_KEY_ALIAS_S3_CSE = process.env.KMS_KEY_ALIAS_S3_CSE;

export function buildKeyring() {
  if (!KMS_KEY_ALIAS_S3_CSE) {
    throw new Error('[kmsUtils] KMS_KEY_ALIAS_S3_CSE env var is required');
  }

  // With @aws-crypto/client-node v4+, it uses the AWS SDK v3 internally.
  // By not providing a clientProvider, it will create its own KMS clients
  // which will automatically respect the AWS_ENDPOINT_URL environment variable.
  return new KmsKeyringNode({
    generatorKeyId: KMS_KEY_ALIAS_S3_CSE,
    keyIds: [KMS_KEY_ALIAS_S3_CSE],
  });
}

const { encrypt: awsEncrypt, decrypt: awsDecrypt } = buildClient(
  CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT,
);

export async function encryptBuffer({ data, encryptionContext = {} }) {
  const keyring = buildKeyring();
  const { result: ciphertext } = await awsEncrypt(keyring, data, {
    encryptionContext: { environment: process.env.NODE_ENV || 'production', ...encryptionContext },
  });
  return Buffer.from(ciphertext);
}

export async function decryptBuffer({ ciphertext }) {
  const keyring = buildKeyring();
  const { plaintext, messageHeader } = await awsDecrypt(keyring, ciphertext);
  return {
    plaintext: Buffer.from(plaintext),
    encryptionContext: messageHeader?.encryptionContext,
  };
}
