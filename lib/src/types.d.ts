/// <reference types="node" />
import { AllSettings } from "camera-interface";
import { ClientMsgType, ServerMsgType } from "./enums";
export declare type ClientMsg = {
    id: number;
    timestamp: number;
    type: ClientMsgType;
    msg: Buffer;
};
export declare type ClientParsedMsg = {
    id: number;
    timestamp: number;
    type: ClientMsgType;
    msg: Buffer;
};
export declare type ServerMsg = {
    id: number;
    timestamp: number;
    type: ServerMsgType;
    msg: Buffer;
};
export declare type ServerParsedMsg = {
    id: number;
    timestamp: number;
    type: ServerMsgType;
    msg: Buffer;
};
export declare type ServerSideEvents = {
    ready: () => void;
    password: (password: string) => void;
    settings: (settings: AllSettings) => void;
    error: (error: Error) => void;
};
