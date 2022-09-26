// eslint-disable-next-line @typescript-eslint/no-var-requires
const Buffer = require("buffer/").Buffer;  // note: the trailing slash is important!
import WebSocket from "isomorphic-ws";
import crypto from "crypto";
import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
import CameraInterface, { AllSettings, CameraEvents } from "camera-interface";

import { ClientMsgType, ServerMsgType } from "./enums";
import { ClientMsg, ServerMsg } from "./types";
import * as utils from "./utils";

const CURVE_NAME = "secp521r1";

export default class WebClient implements CameraInterface {
  private events_ = new EventEmitter() as TypedEmitter<CameraEvents>;
  get events() { return this.events_; }

  private restart_ = true;

  private frame_timeout_: NodeJS.Timeout;

  private socket_: WebSocket.WebSocket;
  private address_: string; // Address to connect to

  private ecdh_: crypto.ECDH;
  private cookie_: string;
  private secret_: Buffer;

  private last_id_: number; // Id of last message sent

  private all_settings_: AllSettings; // All the settings of the camera

  constructor(address: string, cookie: string) {
    this.address_ = address;
    this.cookie_ = cookie;
    this.Connect();
  }

  SetCombinedSettings(settings: AllSettings): void {
    try {
      const encrypted = utils.AesEncrypt(Buffer.from(JSON.stringify(settings), "utf-8"), this.secret_);
      this.socket_.send(this.GenMsg(ClientMsgType.settings, encrypted).msg);
    } catch (error) {
      console.warn(`Error encrypting settings, terminating connection. Error: ${error}`);
      this.socket_.close();
      return;
    }
  }
  GetCombinedSettings(): AllSettings { return this.all_settings_; }

  /**
   * SetPassword() - Sets a new password
   * @param pwd new password
   */
  SetPassword(pwd: string) {
    try {
      const encrypted = utils.AesEncrypt(Buffer.from(pwd, "utf-8"), this.secret_);
      this.socket_.send(this.GenMsg(ClientMsgType.pwd, encrypted).msg);
    } catch (error) {
      console.warn(`Error encrypting new password, terminating connection. Error: ${error}`);
      this.socket_.close();
      return;
    }
  }

  /**
   * Stop() - Fully stops websocket
   */
  Stop() {
    clearTimeout(this.frame_timeout_);
    this.restart_ = false;
    this.socket_.close();
  }

  /**
   * Connect() - Connects to address, reconnects on failure after a delay
   */
  private Connect() {
    if (!this.restart_) return;
    this.socket_ = new WebSocket(this.address_);

    this.socket_.onopen = () => {
      console.log(`Opened socket with: ${this.address_}`);

      // Begin ECDH key exchange once connected
      this.ecdh_ = crypto.createECDH(CURVE_NAME);
      const keys = this.ecdh_.generateKeys();

      this.Send(this.GenMsg(ClientMsgType.auth0, keys));
    };
    this.socket_.binaryType = "arraybuffer";

    this.socket_.onmessage = (event) => {
      this.MessageHandler(event.data as ArrayBuffer);
    };

    this.socket_.onclose = () => {
      this.events_.emit("disconnect");
      setTimeout(() => { this.Connect(); }, 2000 + Math.random() * 1000);
    };

    this.socket_.onerror = (error) => {
      console.warn(`Error on connection with ${this.address_}. Error: ${error}`);
      this.events_.emit("error", new Error(error.message));
      this.socket_.close();
    };
  }

  /**
   * Auth0Handler() - Handles responding to auth0 message
   * @param auth0 auth0 message
   */
  private Auth0Handler(auth0: ServerMsg) {
    try {
      this.secret_ = this.ecdh_.computeSecret(auth0.msg).subarray(0, 16);
    }
    catch (error) {
      console.warn(`Failed to compute secret key, terminating connection ${this.address_}. Error: ${error}`);
    }

    let encrypted;
    try {
      encrypted = utils.AesEncrypt(Buffer.from(this.cookie_, "utf-8"), this.secret_);
    }
    catch (error) {
      console.warn(`Failed to encrypt message, terminating connection with ${this.address_}. Error: ${error}`);
      this.socket_.close();
      return;
    }

    this.Send(this.GenMsg(ClientMsgType.auth1, encrypted));
  }

  /**
   * Auth1Handler() - Handles responding to auth1 message
   * @param auth1 auth1 message
   */
  private Auth1Handler(auth1: ServerMsg) {
    try {
      this.all_settings_ = JSON.parse(utils.AesDecrypt(auth1.msg, this.secret_).toString("utf-8"));
    }
    catch (error) {
      console.warn(`Failed to decrypt and parse camera settings from camera message, terminating connection with ${this.address_}. Error: ${error}`);
      this.socket_.close();
      return;
    }
    this.events.emit("ready", this.all_settings_);
  }

  /**
   * FrameHandler() - Handles responding to frame message
   * @param frame_msg frame message
   */
  private FrameHandler(frame_msg: ServerMsg) {
    clearInterval(this.frame_timeout_);
    this.frame_timeout_ = setTimeout(() => {
      console.warn(`Did not recieve frames for 10 seconds, terminating connection with ${this.address_}`);
      this.socket_.close();
    }, 10000);

    this.SendAck(frame_msg);

    let data;
    try {
      data = utils.AesDecrypt(frame_msg.msg, this.secret_);
    } catch (error) {
      console.warn(`Failed to decrypt and parse frame from camera, terminating connection with ${this.address_}. Error: ${error}`);
      this.socket_.close();
      return;
    }

    let motion;
    let timestamp;
    let frame;
    try {
      motion = data.readUInt8(0) == 1;
      timestamp = Number(data.readBigInt64BE(1));
      frame = data.subarray(9, data.length);
    }
    catch (error) {
      console.warn(`Error while parsing frame, terminating connection with ${this.address_}. Error: ${error}`);
      this.socket_.close();
      return;
    }
    this.events_.emit("frame", frame, timestamp, motion);
  }

  /**
   * MessageHandler() - Handles socket messages
   * @param msg message buffer
   */
  private MessageHandler(msg: ArrayBuffer) {
    let camera_msg;
    try {
      camera_msg = utils.ParseServerMsgType(msg);
    } catch (error) {
      console.warn(`Error while parsing message, terminating connection with ${this.address_}. Error: ${error}`);
      this.socket_.close();
      return;
    }

    switch (camera_msg.type) {
      case (ServerMsgType.auth0): {
        this.Auth0Handler(camera_msg);
        break;
      }
      case (ServerMsgType.auth1): {
        this.Auth1Handler(camera_msg);
        break;
      }
      case (ServerMsgType.frame): {
        this.FrameHandler(camera_msg);
        break;
      }
      default: {
        console.log(`Recieved unknown message type from ${this.address_}, terminating connection`);
        this.socket_.close();
      }
    }
  }

  /**
   * GenMsg() - Generates messages to send
   * Format: <Message type [UInt8] | MessageId [UInt32LE] | Timestamp [UInt32LE] | Content...>
   * @param type type of message to send
   * @param content content of message
   * @returns object { msg: Buffer, id: number };
   */
  private GenMsg(type: ClientMsgType, content: Buffer): ClientMsg {
    this.last_id_ = (this.last_id_ + 1) / (1 << 32);      // Roll over to 0 if id is over UInt32 size
    const timestamp = Date.now();
    const header = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    header.writeUint8(type, 0);
    header.writeUint32BE(this.last_id_, 1);
    header.writeBigUInt64BE(BigInt(timestamp), 5);

    return {
      id: this.last_id_,
      timestamp,
      type: type,
      msg: Buffer.concat([header, content])
    };
  }

  /**
   * Send() - Send a message
   * @param message message to send
   */
  private Send(message: ClientMsg) {
    try {
      this.socket_.send(message.msg);
    } catch { /* */ }
  }

  /**
   * SendAck() - Send an acknowledgement
   * @param message - Message to acknowledge
   */
  private SendAck(message: ServerMsg) {
    const ack = Buffer.alloc(1 + 4);
    ack.writeUint8(ClientMsgType.ack, 0);
    ack.writeUInt32BE(message.id, 1);
    try {
      this.socket_.send(ack);
    } catch { /* */ }
  }
}