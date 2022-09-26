/// <reference types="node" />
import { ClientParsedMsg, ServerParsedMsg } from "./types";
export declare const KEY_LENGTH = 16;
/**
 * ParseClientMsgType() - Parses the type of incoming client message
 * @param msg message to parse type from
 * @returns type of message
 */
export declare function ParseClientMsgType(msg: Buffer): ClientParsedMsg;
/**
 * ParseServerMsgType() - Parses the type of incoming server message
 * @param m message to parse type from
 * @returns type of message
 */
export declare function ParseServerMsgType(m: ArrayBuffer): ServerParsedMsg;
/**
 * AesEncrypt() - Decrypts aes encrypted data
 * @param data buffer of data to encrypt
 * @param key buffer of key to decrypt data
 * @returns encrypted buffer in format: <Initialization Vector [16 Bytes] | Authentication Tag [16 Bytes] | aes-128-gcm Encrypted Data...>
 */
export declare function AesEncrypt(data: Buffer, key: Buffer): Buffer;
/**
 * AesDecrypt() - Decrypts aes encrypted data
 * @param encrypted encrypted buffer in format: <Initialization Vector [16 Bytes] | Authentication Tag [16 Bytes] | aes-128-gcm Encrypted Data...>
 * @param key buffer of key to decrypt data
 * @returns buffer of unencrypted data
 */
export declare function AesDecrypt(encrypted: Buffer, key: Buffer): Buffer;
