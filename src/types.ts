import { AllSettings } from "camera-interface";
import { ClientMsgType, ServerMsgType } from "./enums";

export type ClientMsg = {
  id: number;
  timestamp: number;
  type: ClientMsgType;
  msg: Buffer;
}

export type ClientParsedMsg = {
  id: number;
  timestamp: number;
  type: ClientMsgType;
  msg: Buffer;
}

export type ServerMsg = {
  id: number;
  timestamp: number;
  type: ServerMsgType;
  msg: Uint8Array;
}

export type ServerParsedMsg = {
  id: number;
  timestamp: number;
  type: ServerMsgType;
  msg: Uint8Array;
}

export type ServerSideEvents = {
  ready: () => void;
  password: (password: string) => void;
  settings: (settings: AllSettings) => void;
  error: (error: Error) => void;
}