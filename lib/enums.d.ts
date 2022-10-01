export declare enum ClientMsgType {
    unknown = 0,
    ack = 1,
    auth0 = 2,
    auth1 = 3
}
export declare enum ServerMsgType {
    unknown = 255,
    auth0 = 254,
    auth1 = 253,
    frame = 252
}
/**
 * Message Sequence
 *
 * client                  server
 * | on open                    |
 * | ----------auth0----------> |
 * |              on connection |
 * | <---------auth0----------- |
 *
 * | on auth0                   |
 * | ----------auth1----------> |
 * |                   on auth1 |
 * | <---------auth1----------- |
 *
 * |                   on auth1 |
 * | <----frame (encrypted)---- |
 * | on frame                   |
 * | ----------ack------------> |
 *
 * Header: <Message type [UInt8] | MessageId [UInt3BE]>
 *
 * AESEncrypted: <Initialization Vector [16 Bytes] | Authentication Tag [16 Bytes] | aes-128-gcm Encrypted Data...>
 * Password: Cookie encoded in UTF-8 Buffer
 * Cameras_Wanted: JSON String of (Map: camera_address->cameraId [string->number]) encoded in UTF-8 Buffer
 * Settings: JSON String encoded in UTF-8 Buffer
 *
 * auth0 (client out): <Header | ECDF Public Key Buffer>
 * auth0 (camera out): <Header | ECDF Public Key Buffer>
 *
 * auth1 (client out): <Header | AESEncrypted(Password) | AESEncrypted(Cameras_Wanted)>
 * auth1 (camera out): <Header | AESEncrypted(Settings)>
 *
 * frame (encrypted): <Header | AESEncrypted(<cameraId [Uint8] | motion [Uint8] | timestamp [UBigInt64BE] | Jpeg Data...)>
 * ack: <Header>
 */ 
