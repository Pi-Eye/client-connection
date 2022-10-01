/// <reference types="node" />
import { ClientMsgType, ServerMsgType } from "./enums";
export declare type ClientParsedMsg = {
    type: ClientMsgType;
    msg: Buffer;
};
export declare type ServerMsg = {
    id: number;
    timestamp: number;
    type: ServerMsgType;
    msg: Uint8Array;
};
