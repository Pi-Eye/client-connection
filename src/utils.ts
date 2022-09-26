// eslint-disable-next-line @typescript-eslint/no-var-requires
const Buffer = require("buffer/").Buffer;  // note: the trailing slash is important!
import crypto from "crypto";

import { ClientMsgType, ServerMsgType } from "./enums";
import { ClientParsedMsg, ServerParsedMsg } from "./types";

const KEY_ALGORITHM = "aes-128-gcm";
export const KEY_LENGTH = 16;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const ID_OFFSET = 1;
const TIMESTAMP_OFFSET = 5;
const MSG_OFFSET = 13;

/**
 * ParseClientMsgType() - Parses the type of incoming client message
 * @param msg message to parse type from
 * @returns type of message
 */
export function ParseClientMsgType(msg: Buffer): ClientParsedMsg {
  const id = msg.readUInt32BE(ID_OFFSET);
  switch (msg.readUint8(0)) {
    case (ClientMsgType.ack): {
      return {
        id,
        timestamp: 0,
        type: ClientMsgType.ack,
        msg: msg.subarray(MSG_OFFSET)
      };
    }
    case (ClientMsgType.auth0): {
      return {
        id,
        timestamp: Number(msg.readBigInt64BE(TIMESTAMP_OFFSET)),
        type: ClientMsgType.auth0,
        msg: msg.subarray(MSG_OFFSET)
      };
    }
    case (ClientMsgType.auth1): {
      return {
        id,
        timestamp: Number(msg.readBigInt64BE(TIMESTAMP_OFFSET)),
        type: ClientMsgType.auth1,
        msg: msg.subarray(MSG_OFFSET)
      };
    }
    case (ClientMsgType.settings): {
      return {
        id,
        timestamp: Number(msg.readBigInt64BE(TIMESTAMP_OFFSET)),
        type: ClientMsgType.settings,
        msg: msg.subarray(MSG_OFFSET)
      };
    }
    case (ClientMsgType.pwd): {
      return {
        id,
        timestamp: Number(msg.readBigInt64BE(TIMESTAMP_OFFSET)),
        type: ClientMsgType.pwd,
        msg: msg.subarray(MSG_OFFSET)
      };
    }
    default: {
      return {
        id,
        timestamp: 0,
        type: ClientMsgType.unknown,
        msg: msg.subarray(MSG_OFFSET)
      };
    }
  }
}

/**
 * ParseServerMsgType() - Parses the type of incoming server message
 * @param m message to parse type from
 * @returns type of message
 */
export function ParseServerMsgType(m: ArrayBuffer): ServerParsedMsg {
  const msg: Buffer = Buffer.from(m);
  const id = msg.readUInt32BE(ID_OFFSET);
  switch (msg.readUint8(0)) {
    case (ServerMsgType.auth0): {
      return {
        id,
        timestamp: Number(msg.readBigInt64BE(TIMESTAMP_OFFSET)),
        type: ServerMsgType.auth0,
        msg: msg.subarray(MSG_OFFSET)
      };
    } case (ServerMsgType.auth1): {
      return {
        id,
        timestamp: Number(msg.readBigInt64BE(TIMESTAMP_OFFSET)),
        type: ServerMsgType.auth1,
        msg: msg.subarray(MSG_OFFSET)
      };
    }
    case (ServerMsgType.frame): {
      return {
        id,
        timestamp: Number(msg.readBigInt64BE(TIMESTAMP_OFFSET)),
        type: ServerMsgType.frame,
        msg: msg.subarray(MSG_OFFSET)
      };
    }
    default: {
      return {
        id,
        timestamp: 0,
        type: ServerMsgType.unknown,
        msg: msg.subarray(MSG_OFFSET)
      };
    }
  }
}

/**
 * AesEncrypt() - Decrypts aes encrypted data
 * @param data buffer of data to encrypt
 * @param key buffer of key to decrypt data
 * @returns encrypted buffer in format: <Initialization Vector [16 Bytes] | Authentication Tag [16 Bytes] | aes-128-gcm Encrypted Data...>
 */
export function AesEncrypt(data: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(KEY_ALGORITHM, key, iv);

  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * AesDecrypt() - Decrypts aes encrypted data
 * @param encrypted encrypted buffer in format: <Initialization Vector [16 Bytes] | Authentication Tag [16 Bytes] | aes-128-gcm Encrypted Data...>
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