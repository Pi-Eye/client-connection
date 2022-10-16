import fs from "fs";
import https from "https";
import WebSocket, { AddressInfo } from "ws";
import crypto from "crypto";
import { IncomingMessage } from "http";

import { ClientMsgType, ServerMsgType } from "./enums";
import { ClientParsedMsg, ServerMsg } from "./types";
import * as utils from "./utils";

/**
 * Congestion control behavior intended to implement ideas found in V. Jacobson's 1988 Paper "Congestion Avoidance and Control"
 * V. Jacobson. 1988. Congestion avoidance and control. SIGCOMM Comput. Commun. Rev. 18, 4 (August 1988), 314–329. https://doi.org/10.1145/52325.52356
 */

const CURVE_NAME = process.env.CURVE_NAME || "secp521r1";                 // ECDH algorithm to use
const MAX_QUEUE_LENGTH = parseInt(process.env.MAX_QUEUE_LENGTH) || 30;    // Nmmber of items in queue before dropping frames
const RTT_GAIN = parseFloat(process.env.RTT_GAIN) || 0.125;               // "gain", 0 < gain < 1 for estimating average RTT, see paper
const DEV_GAIN = parseFloat(process.env.DEV_GAIN) || 0.25;                // "gain", 0 < gain < 1 for estimating mean deviation, see paper

type SocketProperties = {
  id: number;
  address: string;
  ack_timeout: NodeJS.Timeout;
  rtt_avg: number;
  mean_dev: number;
  rto_interval: number;
  last_send_window_count: number;
  rto_timeout: NodeJS.Timeout;
  connected: boolean;
  sockets_wanted: {
    [key: string]: number
  },
  ecdh: crypto.ECDH;
  keys: Buffer;
  secret: Buffer;
  last_id: number;
  inflight: Array<number>;  // timestamps of sent frames
  send_queue: Array<Buffer>;
  socket: WebSocket.WebSocket;
};

export default class ServerSide {
  private https_: https.Server;
  private server_: WebSocket.Server;
  private sockets_: Array<SocketProperties> = [];

  private next_id_ = 0;

  private auth_function_: (cookie: string) => Promise<boolean>;

  private port_: number;
  private cert_path_: string;
  private key_path_: string;

  constructor(port: number, cert_path: string, key_path: string, auth_function: (cookie: string) => Promise<boolean>) {
    this.cert_path_ = cert_path;
    this.key_path_ = key_path;
    this.port_ = port;
    this.auth_function_ = auth_function;

    this.https_ = https.createServer({
      cert: fs.readFileSync(this.cert_path_),
      key: fs.readFileSync(this.key_path_)
    });

    this.CreateServer();
    this.https_.listen(this.port_);

  }

  /**
   * QueueFrame() - Queues up a frame to be sent
   * @param frame frame to queue
   * @param timestamp timestamp of frame
   * @param motion motion on frame or not
   * @param address address of camera
   */
  QueueFrame(frame: Buffer, timestamp: number, motion: boolean, address: string) {
    const motion_int = (motion) ? 1 : 0;
    const header = Buffer.alloc(1 + 1 + 8);
    header.writeUint8(motion_int, 1);
    header.writeBigInt64BE(BigInt(timestamp), 2);

    for (let i = 0; i < this.sockets_.length; i++) {
      const socket_props = this.sockets_[i];
      if (socket_props.sockets_wanted[address] === undefined) { continue; }

      header.writeUint8(socket_props.sockets_wanted[address], 0);
      if (socket_props.send_queue.length == MAX_QUEUE_LENGTH) {
        console.warn("Queue full, dropping frames");
        this.HalveQueue(socket_props);
      }

      let encrypted;
      try {
        encrypted = utils.AesEncrypt(Buffer.concat([header, frame]), socket_props.secret);
      } catch (error) {
        console.warn(`Error while encrypting frame, terminating connection. Error: ${error}`);
        socket_props.socket.close();
        return;
      }

      socket_props.send_queue.push(encrypted);
    }
  }

  /**
   * Stop() - Fully stops websocket server
   */
  Stop() {
    try {
      this.server_.clients.forEach((socket) => { socket.close(); });
      this.server_.close();
    } catch (error) {
      console.warn(error);
    }
  }

  /**
   * CreateServer() - Creates websocket server
   */
  private CreateServer() {


    this.server_ = new WebSocket.Server({ server: this.https_ });

    this.server_.on("connection", (socket, request) => {
      this.SocketHandler(socket, request);
    });

    this.server_.on("listening", () => {
      const address = (this.server_.address() as AddressInfo).address + ":" + (this.server_.address() as AddressInfo).port;
      console.log(`Server listening on ${address}`);
    });

    // Just close socket if an error occurs
    this.server_.on("error", (error) => {
      this.server_.close();
      throw error;
    });

    // Restart the socket if it closes (unless restart_ set to false)
    this.server_.on("close", () => {
      console.log("Server that was listening closed");
      this.server_.removeAllListeners();
    });

  }

  /**
   * AckHandler() - Handles acknowledgement of recieved data
   * @param ack acknowledgement message
   */
  private AckHandler(ack: ClientParsedMsg, socket_props: SocketProperties) {
    clearInterval(socket_props.ack_timeout);
    socket_props.ack_timeout = setTimeout(() => {
      console.warn(`Did not recieve acknowledgements for 10 seconds, terminating connection with ${socket_props.address}`);
      try { socket_props.socket.close(); } catch { /* */ }
    }, 10000);

    const sent_time = socket_props.inflight.shift();
    const rtt = Date.now() - sent_time;

    // Calculate next rto_interval
    const err = rtt - socket_props.rtt_avg;
    socket_props.rtt_avg = socket_props.rtt_avg + RTT_GAIN * err;
    socket_props.mean_dev = socket_props.mean_dev + DEV_GAIN * (Math.abs(err) - socket_props.mean_dev);

    socket_props.rto_interval = socket_props.rtt_avg + socket_props.mean_dev;

    if (socket_props.inflight.length == 0) { this.SendWindow(socket_props, socket_props.last_send_window_count + 1); }
  }

  /**
   * Auth0Handler() - Handles responding to auth0 message
   * @param auth0 auth0 message
   * @param socket_props websocket properties
   */
  private async Auth0Handler(auth0: ClientParsedMsg, socket_props: SocketProperties) {
    try {
      const key = socket_props.ecdh.computeSecret(auth0.msg);
      socket_props.secret = crypto.createHash("sha256").update(key).digest().subarray(0, 16);
    }
    catch (error) {
      console.warn(`Failed to compute secret key, terminating connection with ${socket_props.address}. Error: ${error}`);
      socket_props.socket.close();
    }
  }

  /**
   * Auth1Handler() - Handles responding to auth1 message
   * @param auth1 auth1 message
   * @param socket_props websocket properties
   */
  private async Auth1Handler(auth1: ClientParsedMsg, socket_props: SocketProperties) {
    // Parse out cookie
    let auth1_info;
    utils.AesDecrypt(auth1.msg, socket_props.secret);
    try {
      auth1_info = JSON.parse(utils.AesDecrypt(auth1.msg, socket_props.secret).toString("utf-8"));

    } catch (error) {
      console.warn(`Failed to decrypt cookie, terminating connection with ${socket_props.address}. Error: ${error}`);
      socket_props.socket.close();
      return;
    }

    // Verify 
    if (!(await this.auth_function_(auth1_info.cookie))) {
      console.warn(`Incorrect cookie recieved, terminating connection with ${socket_props.address}`);
      socket_props.socket.close();
      return;
    }

    // Getting here means successful authentication
    console.log(`Authenticated successfully with ${socket_props.address}`);
    socket_props.sockets_wanted = auth1_info.sockets_wanted;
    socket_props.rtt_avg = 0;
    socket_props.rto_interval = 0;
    socket_props.mean_dev = 0;
    socket_props.send_queue = [];
    this.sockets_.push(socket_props);
    this.SendWindow(socket_props);
  }

  /**
   * SocketHandler() - Handles authenticating connection, then recieving messages on connection
   * @param socket socket to authenticate
   * @param request information about the request header
   */
  private SocketHandler(socket: WebSocket.WebSocket, request: IncomingMessage) {
    const socket_props: SocketProperties = {
      id: this.next_id_,
      address: (request.socket.address() as AddressInfo).address + ":" + (request.socket.address() as AddressInfo).port,
      ack_timeout: undefined,
      rtt_avg: 0,
      mean_dev: 0,
      rto_interval: 0,
      last_send_window_count: 1,
      rto_timeout: undefined,
      connected: true,
      sockets_wanted: {},
      send_queue: [],
      socket: socket,
      ecdh: crypto.createECDH(CURVE_NAME),
      keys: undefined,
      secret: undefined,
      last_id: 0,
      inflight: []
    };
    this.next_id_++;
    console.log(`Opened socket with: ${socket_props.address}`);

    // Begin ECDH key exchange once connected
    socket_props.keys = socket_props.ecdh.generateKeys();
    socket_props.socket.send(this.GenMsg(ServerMsgType.auth0, socket_props.keys, socket_props).msg);

    socket_props.socket.on("message", (data, isBinary) => {
      if (!isBinary) { // Close connection if invalid data recieved
        console.warn(`Recieved non binary data, terminating connection with ${socket_props.address}`);
        socket.close();
        return;
      }

      this.MessageHandler(data as Buffer, socket_props);
    });

    socket_props.socket.on("close", (code) => {
      console.log(`Connection closed with ${socket_props.address} with code: ${code}`);
      socket_props.connected = false;
      clearTimeout(socket_props.ack_timeout);
      clearTimeout(socket_props.rto_timeout);
      socket_props.send_queue = [];
      socket_props.socket.removeAllListeners();
      for (let i = 0; i < this.sockets_.length; i++) {
        if (this.sockets_[i].id == socket_props.id) {
          this.sockets_.splice(i, 1);
        }
      }
    });

    socket.on("error", (error) => {
      console.warn(`Error on connection with ${socket_props.address}. Error: ${error}`);
      socket.close();
    });
  }

  /**
   * MessageHandler() - Handles socket messages
   * @param msg message buffer
   * @param socket_props websocket properties
   */
  private MessageHandler(msg: Buffer, socket_props: SocketProperties) {
    let client_msg;
    try {
      client_msg = utils.ParseClientMsgType(msg);
    } catch (error) {
      console.warn(`Error while parsing message, terminating connection with ${socket_props.address}. Error: ${error}`);
      socket_props.socket.close();
      return;
    }

    switch (client_msg.type) {
      case (ClientMsgType.ack): {
        this.AckHandler(client_msg, socket_props);
        break;
      }
      case (ClientMsgType.auth0): {
        this.Auth0Handler(client_msg, socket_props);
        break;
      }
      case (ClientMsgType.auth1): {
        this.Auth1Handler(client_msg, socket_props);
        break;
      }
      default: {
        console.warn(`Recieved type: ${client_msg.type} message before authentication, terminating connection with ${socket_props.address}`);
        socket_props.socket.close();
      }
    }
    return;
  }


  /**
   * HalveQueue() - Removes half of the frames in send queue
   * @param socket_props websocket properties
   */
  private HalveQueue(socket_props: SocketProperties) {
    const new_queue: Array<Buffer> = [];

    for (let i = 0; i < socket_props.send_queue.length; i++) {
      if (i % 2 == 0) {
        new_queue.push(socket_props.send_queue.splice(i, 1)[0]);
      }
      else {
        socket_props.send_queue.splice(i, 1);
      }
    }
    socket_props.send_queue = new_queue;
  }

  /**
   * SendWindow() - Send this.send of frames from queue
   * @param socket_props websocket properties
   * @param number number of frames to send
   */
  private SendWindow(socket_props: SocketProperties, number?: number) {
    if (!socket_props.connected) return;
    if (!number || number < 1) number = 1;
    socket_props.last_send_window_count = number;
    clearInterval(socket_props.rto_timeout);

    for (let i = 0; i < number && socket_props.send_queue.length > 0; i++) {
      try {
        const message = this.GenMsg(ServerMsgType.frame, socket_props.send_queue.shift(), socket_props);
        this.Send(socket_props, message);
      } catch (error) {
        console.warn(`Error while encrypting frame to send, terminating connection. Error: ${error}`);
        socket_props.socket.close();
      }
    }

    socket_props.rto_timeout = setTimeout(() => {
      this.SendWindow(socket_props, Math.round(socket_props.last_send_window_count / 2));
    }, socket_props.rto_interval);
  }

  /**
   * GenMsg() - Generates messages to send
   * Format: <Message type [UInt8] | MessageId [UInt32BE] | Timestamp [UInt64BE] | Content...>
   * @param type type of message to send
   * @param content content of message
   * @param socket_props websocket properties
   * @returns object { msg: Buffer, id: number };
   */
  private GenMsg(type: ServerMsgType, content: Buffer, socket_props: SocketProperties): ServerMsg {
    socket_props.last_id = (socket_props.last_id + 1) / (1 << 32);      // Roll over to 0 if id is over UInt32 size
    const timestamp = Date.now();
    const header = Buffer.alloc(1);
    header.writeUint8(type, 0);

    return {
      id: socket_props.last_id,
      timestamp,
      type: type,
      msg: Buffer.concat([header, content])
    };
  }

  /**
   * Send() - Send a message
   * @param socket_props websocket properties
   * @param message message to send
   */
  private Send(socket_props: SocketProperties, message: ServerMsg) {
    socket_props.inflight.push(message.timestamp);
    try {
      socket_props.socket.send(message.msg);
    } catch { /* */ }
  }
}