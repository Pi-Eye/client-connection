import { should } from "chai";
should();

import { ClientMsgType, ServerMsgType } from "../src/enums";
import * as utils from "../src/utils";

describe("Parse Server Message", () => {
  function ArrayBufferFrom(buffer: Buffer) {
    const arraybuffer = new ArrayBuffer(buffer.length);
    const uint8 = new Uint8Array(arraybuffer);
    for (let i = 0; i < buffer.length; ++i) {
      uint8[i] = buffer[i];
    }
    return arraybuffer;
  }

  it("should parse out correct data", () => {
    const id = 10;
    let type = ServerMsgType.auth0;
    const timestamp = 1668075758024;
    const msg = Buffer.from([255, 0, 127]);

    const header = Buffer.alloc(1 + 4 + 8);
    header.writeUint8(type, 0);
    header.writeUint32BE(id, 1);
    header.writeBigUInt64BE(BigInt(timestamp), 5);

    let parsed = utils.ParseServerMsgType(ArrayBufferFrom(Buffer.concat([header, msg])));
    parsed.id.should.equal(id);
    parsed.timestamp.should.equal(timestamp);
    parsed.type.should.equal(type);
    Buffer.compare(parsed.msg, msg).should.equal(0);

    type = ServerMsgType.auth1;
    header.writeUint8(type, 0);
    parsed = utils.ParseServerMsgType(ArrayBufferFrom(Buffer.concat([header, msg])));
    parsed.id.should.equal(id);
    parsed.timestamp.should.equal(timestamp);
    parsed.type.should.equal(type);
    Buffer.compare(parsed.msg, msg).should.equal(0);

    type = ServerMsgType.frame;
    header.writeUint8(type, 0);
    parsed = utils.ParseServerMsgType(ArrayBufferFrom(Buffer.concat([header, msg])));
    parsed.id.should.equal(id);
    parsed.timestamp.should.equal(timestamp);
    parsed.type.should.equal(type);
    Buffer.compare(parsed.msg, msg).should.equal(0);

    type = 127;
    header.writeUint8(type, 0);
    parsed = utils.ParseServerMsgType(ArrayBufferFrom(Buffer.concat([header, msg])));
    parsed.id.should.equal(id);
    parsed.timestamp.should.equal(0);
    parsed.type.should.equal(ServerMsgType.unknown);
    Buffer.compare(parsed.msg, msg).should.equal(0);
  });
});

describe("Parse Client Message", () => {


  it("should parse out correct data", () => {
    const id = 10;
    let type = ClientMsgType.ack;
    const timestamp = Date.now();
    const msg = Buffer.from([255, 0, 127]);

    const header = Buffer.alloc(1 + 4 + 8);
    header.writeUint8(type, 0);
    header.writeUint32BE(id, 1);
    header.writeBigUInt64BE(BigInt(timestamp), 5);

    let parsed = utils.ParseClientMsgType(Buffer.concat([header, msg]));
    parsed.id.should.equal(id);
    parsed.timestamp.should.equal(0);
    parsed.type.should.equal(type);
    parsed.msg.equals(msg).should.be.true;

    type = ClientMsgType.auth0;
    header.writeUint8(type, 0);
    parsed = utils.ParseClientMsgType(Buffer.concat([header, msg]));
    parsed.id.should.equal(id);
    parsed.timestamp.should.equal(timestamp);
    parsed.type.should.equal(type);
    parsed.msg.equals(msg).should.be.true;

    type = ClientMsgType.auth1;
    header.writeUint8(type, 0);
    parsed = utils.ParseClientMsgType(Buffer.concat([header, msg]));
    parsed.id.should.equal(id);
    parsed.timestamp.should.equal(timestamp);
    parsed.type.should.equal(type);
    parsed.msg.equals(msg).should.be.true;

    type = ClientMsgType.settings;
    header.writeUint8(type, 0);
    parsed = utils.ParseClientMsgType(Buffer.concat([header, msg]));
    parsed.id.should.equal(id);
    parsed.timestamp.should.equal(timestamp);
    parsed.type.should.equal(type);
    parsed.msg.equals(msg).should.be.true;

    type = 127;
    header.writeUint8(type, 0);
    parsed = utils.ParseClientMsgType(Buffer.concat([header, msg]));
    parsed.id.should.equal(id);
    parsed.timestamp.should.equal(0);
    parsed.type.should.equal(ClientMsgType.unknown);
    parsed.msg.equals(msg).should.be.true;
  });
});


describe("AesEncrypt and AesDecrypt", () => {
  it("should decrypt test encrypted buffer correctly", () => {
    const key = Buffer.from([0xc4, 0x91, 0x91, 0xee, 0xbc, 0x85, 0xda, 0xc6, 0x31, 0x00, 0x38, 0x1d, 0x69, 0xf6, 0x1d, 0xd1]);
    const iv = Buffer.from([0x13, 0x67, 0x5e, 0xf6, 0x0e, 0x90, 0x69, 0x5c, 0x42, 0x63, 0x81, 0xd6, 0xce, 0xec, 0xaa, 0x6c]);
    const auth_key = Buffer.from([0xbf, 0xa9, 0xf1, 0x16, 0x90, 0xe2, 0xf8, 0x49, 0x45, 0xbf, 0x9c, 0x39, 0x38, 0xd2, 0x20, 0x91]);
    const data = Buffer.from([0x64, 0xb9, 0xaf, 0x7d]);

    utils.AesDecrypt(Buffer.concat([iv, auth_key, data]), key).toString().should.equal("Test");
  });

  it("should encrypt data correctly", () => {
    const key = Buffer.from([0xc4, 0x91, 0x91, 0xee, 0xbc, 0x85, 0xda, 0xc6, 0x31, 0x00, 0x38, 0x1d, 0x69, 0xf6, 0x1d, 0xd1]);
    const data = Buffer.from("Test", "utf-8");
    utils.AesDecrypt(utils.AesEncrypt(data, key), key).toString().should.equal("Test");
  });

  it("should throw errors if something fails", () => {
    const key = Buffer.from([0xc4, 0x91, 0x91, 0xee, 0xbc, 0x85, 0xda, 0xc6, 0x31, 0x00, 0x38, 0x1d, 0x69, 0xf6, 0x1d, 0xd1]);
    const iv = Buffer.from([0x13, 0x67, 0x5e, 0xf6, 0x0e, 0x90, 0x69, 0x5c, 0x42, 0x63, 0x81, 0xd6, 0xce, 0xec, 0xaa, 0x6c]);
    const auth_key = Buffer.from([0xbf, 0xa9, 0xf1, 0x16, 0x90, 0xe2, 0xf8, 0x49, 0x45, 0xbf, 0x9c, 0x39, 0x38, 0xd2, 0x20, 0x91]);
    const data = Buffer.from([0x64, 0xb9, 0xaf, 0x7d]);

    (() => utils.AesEncrypt(Buffer.from("Test", "utf-8"), key.subarray(0, 15))).should.Throw();
    (() => utils.AesDecrypt(Buffer.concat([iv, auth_key, data]), key.subarray(0, 15))).should.Throw();
    (() => utils.AesDecrypt(Buffer.concat([iv.subarray(0, 15), auth_key, data]), key)).should.Throw();
    (() => utils.AesDecrypt(Buffer.concat([iv, auth_key.subarray(0, 15), data]), key)).should.Throw();
    (() => utils.AesDecrypt(Buffer.concat([iv, auth_key, data.subarray(0, 2)]), key)).should.Throw();
  });
});