/// <reference types="node" />
export default class ServerSide {
    private server_;
    private sockets_;
    private next_id_;
    private auth_function_;
    private port_;
    constructor(port: number, auth_function: (cookie: string) => Promise<boolean>);
    /**
     * QueueFrame() - Queues up a frame to be sent
     * @param frame frame to queue
     * @param timestamp timestamp of frame
     * @param motion motion on frame or not
     * @param address address of camera
     */
    QueueFrame(frame: Buffer, timestamp: number, motion: boolean, address: string): void;
    /**
     * Stop() - Fully stops websocket server
     */
    Stop(): void;
    /**
     * CreateServer() - Creates websocket server
     */
    private CreateServer;
    /**
     * AckHandler() - Handles acknowledgement of recieved data
     * @param ack acknowledgement message
     */
    private AckHandler;
    /**
     * Auth0Handler() - Handles responding to auth0 message
     * @param auth0 auth0 message
     * @param socket_props websocket properties
     */
    private Auth0Handler;
    /**
     * Auth1Handler() - Handles responding to auth1 message
     * @param auth1 auth1 message
     * @param socket_props websocket properties
     */
    private Auth1Handler;
    /**
     * SocketHandler() - Handles authenticating connection, then recieving messages on connection
     * @param socket socket to authenticate
     * @param request information about the request header
     */
    private SocketHandler;
    /**
     * MessageHandler() - Handles socket messages
     * @param msg message buffer
     * @param socket_props websocket properties
     */
    private MessageHandler;
    /**
     * HalveQueue() - Removes half of the frames in send queue
     * @param socket_props websocket properties
     */
    private HalveQueue;
    /**
     * SendWindow() - Send this.send of frames from queue
     * @param socket_props websocket properties
     * @param number number of frames to send
     */
    private SendWindow;
    /**
     * GenMsg() - Generates messages to send
     * Format: <Message type [UInt8] | MessageId [UInt32BE] | Timestamp [UInt64BE] | Content...>
     * @param type type of message to send
     * @param content content of message
     * @param socket_props websocket properties
     * @returns object { msg: Buffer, id: number };
     */
    private GenMsg;
    /**
     * Send() - Send a message
     * @param socket_props websocket properties
     * @param message message to send
     */
    private Send;
}
