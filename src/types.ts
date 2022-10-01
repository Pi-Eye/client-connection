import { ClientMsgType, ServerMsgType } from "./enums";

export type ClientParsedMsg = {
  type: ClientMsgType;
  msg: Buffer;
}

export type ServerMsg = {
  id: number;
  timestamp: number;
  type: ServerMsgType;
  msg: Uint8Array;
}