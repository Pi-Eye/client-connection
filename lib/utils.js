"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AesDecrypt = exports.AesEncrypt = exports.ParseClientMsgType = exports.KEY_LENGTH = void 0;
const crypto_1 = __importDefault(require("crypto"));
const enums_1 = require("./enums");
const KEY_ALGORITHM = "aes-128-gcm";
exports.KEY_LENGTH = 16;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const MSG_OFFSET = 1;
/**
 * ParseClientMsgType() - Parses the type of incoming client message
 * @param msg message to parse type from
 * @returns type of message
 */
function ParseClientMsgType(msg) {
    switch (msg.readUint8(0)) {
        case (enums_1.ClientMsgType.ack): {
            return {
                type: enums_1.ClientMsgType.ack,
                msg: msg.subarray(MSG_OFFSET)
            };
        }
        case (enums_1.ClientMsgType.auth0): {
            return {
                type: enums_1.ClientMsgType.auth0,
                msg: msg.subarray(MSG_OFFSET)
            };
        }
        case (enums_1.ClientMsgType.auth1): {
            return {
                type: enums_1.ClientMsgType.auth1,
                msg: msg.subarray(MSG_OFFSET)
            };
        }
        default: {
            return {
                type: enums_1.ClientMsgType.unknown,
                msg: msg.subarray(MSG_OFFSET)
            };
        }
    }
}
exports.ParseClientMsgType = ParseClientMsgType;
/**
 * AesEncrypt() - Decrypts aes encrypted data
 * @param data buffer of data to encrypt
 * @param key buffer of key to decrypt data
 * @returns encrypted buffer in format: <Initialization Vector [16 Bytes] | aes-128-gcm Encrypted Data... | Authentication Tag [16 Bytes]>
 */
function AesEncrypt(data, key) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(KEY_ALGORITHM, key, iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, encrypted, authTag]);
}
exports.AesEncrypt = AesEncrypt;
/**
 * AesDecrypt() - Decrypts aes encrypted data
 * @param encrypted encrypted buffer in format: <Initialization Vector [16 Bytes] | aes-128-gcm Encrypted Data... | Authentication Tag [16 Bytes] >
 * @param key buffer of key to decrypt data
 * @returns buffer of unencrypted data
 */
function AesDecrypt(encrypted, key) {
    const iv = encrypted.subarray(0, IV_LENGTH);
    const authTag = encrypted.subarray(encrypted.length - AUTH_TAG_LENGTH);
    const data = encrypted.subarray(IV_LENGTH, encrypted.length - AUTH_TAG_LENGTH);
    const decipher = crypto_1.default.createDecipheriv(KEY_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(data);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted;
}
exports.AesDecrypt = AesDecrypt;
//# sourceMappingURL=utils.js.map