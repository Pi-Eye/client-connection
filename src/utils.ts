import crypto from "crypto";

import { ClientMsgType } from "./enums";
import { ClientParsedMsg } from "./types";

const KEY_ALGORITHM = "aes-128-gcm";
export const KEY_LENGTH = 16;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const MSG_OFFSET = 1;

/**
 * ParseClientMsgType() - Parses the type of incoming client message
 * @param msg message to parse type from
 * @returns type of message
 */
export function ParseClientMsgType(msg: Buffer): ClientParsedMsg {
  switch (msg.readUint8(0)) {
    case (ClientMsgType.ack): {
      return {
        type: ClientMsgType.ack,
        msg: msg.subarray(MSG_OFFSET)
      };
    }
    case (ClientMsgType.auth0): {
      return {
        type: ClientMsgType.auth0,
        msg: msg.subarray(MSG_OFFSET)
      };
    }
    case (ClientMsgType.auth1): {
      return {
        type: ClientMsgType.auth1,
        msg: msg.subarray(MSG_OFFSET)
      };
    }
    default: {
      return {
        type: ClientMsgType.unknown,
        msg: msg.subarray(MSG_OFFSET)
      };
    }
  }
}

/**
 * AesEncrypt() - Decrypts aes encrypted data
 * @param data buffer of data to encrypt
 * @param key buffer of key to decrypt data
 * @returns encrypted buffer in format: <Initialization Vector [16 Bytes] | aes-128-gcm Encrypted Data... | Authentication Tag [16 Bytes]>
 */
export function AesEncrypt(data: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(KEY_ALGORITHM, key, iv);

  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, authTag]);
}

/**
 * AesDecrypt() - Decrypts aes encrypted data
 * @param encrypted encrypted buffer in format: <Initialization Vector [16 Bytes] | aes-128-gcm Encrypted Data... | Authentication Tag [16 Bytes] >
 * @param key buffer of key to decrypt data
 * @returns buffer of unencrypted data
 */
export function AesDecrypt(encrypted: Buffer, key: Buffer): Buffer {
  const iv = encrypted.subarray(0, IV_LENGTH);
  const authTag = encrypted.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const data = encrypted.subarray(IV_LENGTH + AUTH_TAG_LENGTH, encrypted.length);

  const decipher = crypto.createDecipheriv(KEY_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(data);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted;
}