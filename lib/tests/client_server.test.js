"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const node_stream_processor_types_1 = require("node-stream-processor-types");
const client_1 = __importDefault(require("../src/client"));
const server_1 = __importDefault(require("../src/server"));
const PORT = 8080;
describe("Initialization", () => {
    const settings = {
        camera: { width: 640, height: 480, format: node_stream_processor_types_1.SPEnums.Format.kRGB, quality: 75 },
        text: { font_path: "./test/font.tff", text_position: node_stream_processor_types_1.SPEnums.TextPosition.kBottom, font_size: 9, show_date: false },
        motion: { gaussian_size: 1, scale_denominator: 3, bg_stabil_length: 9, motion_stabil_length: 2, min_pixel_diff: 10, min_changed_pixels: 0.1, motion_fps_scale: 2 },
        device: { device_type: node_stream_processor_types_1.SPEnums.DeviceType.kSpecific, device_choice: 0 }
    };
    it("should fail if wrong password provided", (done) => {
        const server = new server_1.default(PORT, settings, (cookie) => { return cookie === "cookie"; });
        const client = new client_1.default("ws://localhost:8080", "password");
        server.events.on("ready", () => {
            server.Stop();
            client.Stop();
            done(false);
        });
        setTimeout(() => {
            server.Stop();
            client.Stop();
            done();
        }, 1000);
    });
    it("should be successful if correct password is provided", (done) => {
        const server = new server_1.default(PORT, settings, (cookie) => { return cookie === "cookie"; });
        const client = new client_1.default("ws://localhost:8080", "cookie");
        server.events.on("ready", () => {
            server.Stop();
            client.Stop();
            done();
        });
    });
    it("should send camera settings once authenticated", (done) => {
        const server = new server_1.default(PORT, settings, (cookie) => { return cookie === "cookie"; });
        const client = new client_1.default("ws://localhost:8080", "cookie");
        client.events.on("ready", (set) => {
            server.Stop();
            client.Stop();
            JSON.stringify(set).should.equal(JSON.stringify(settings));
            done();
        });
    });
});
describe("Send Messages", () => {
    const settings = {
        camera: { width: 640, height: 480, format: node_stream_processor_types_1.SPEnums.Format.kRGB, quality: 75 },
        text: { font_path: "./test/font.tff", text_position: node_stream_processor_types_1.SPEnums.TextPosition.kBottom, font_size: 9, show_date: false },
        motion: { gaussian_size: 1, scale_denominator: 3, bg_stabil_length: 9, motion_stabil_length: 2, min_pixel_diff: 10, min_changed_pixels: 0.1, motion_fps_scale: 2 },
        device: { device_type: node_stream_processor_types_1.SPEnums.DeviceType.kSpecific, device_choice: 0 }
    };
    it("should successfully send frame", (done) => {
        const server = new server_1.default(PORT, settings, () => { return true; });
        const client = new client_1.default("ws://localhost:8080", "cookie");
        const frame = crypto_1.default.randomBytes(100);
        const timestamp = Date.now();
        server.events.on("ready", () => {
            server.QueueFrame(frame, timestamp, false);
        });
        client.events.on("frame", (f, ts, m) => {
            client.Stop();
            server.Stop();
            Buffer.compare(f, frame).should.equal(0);
            ts.should.equal(timestamp);
            m.should.be.false;
            done();
        });
    });
    it("should emit new settings event when receving new settings", (done) => {
        const server = new server_1.default(PORT, settings, () => { return true; });
        const client = new client_1.default("ws://localhost:8080", "cookie");
        const new_settings = {
            camera: { width: 320, height: 240, format: node_stream_processor_types_1.SPEnums.Format.kGray, quality: 50 },
            text: { font_path: "./test/other/font.tff", text_position: node_stream_processor_types_1.SPEnums.TextPosition.kTop, font_size: 18, show_date: true },
            motion: { gaussian_size: 3, scale_denominator: 2, bg_stabil_length: 13, motion_stabil_length: 1, min_pixel_diff: 5, min_changed_pixels: 0.11, motion_fps_scale: 3 },
            device: { device_type: node_stream_processor_types_1.SPEnums.DeviceType.kGPU, device_choice: 1 }
        };
        server.events.on("ready", () => {
            client.SetCombinedSettings(new_settings);
        });
        server.events.on("settings", (set) => {
            server.Stop();
            client.Stop();
            JSON.stringify(set).should.equal(JSON.stringify(new_settings));
            done();
        });
    });
});
describe("Set new password", () => {
    const settings = {
        camera: { width: 640, height: 480, format: node_stream_processor_types_1.SPEnums.Format.kRGB, quality: 75 },
        text: { font_path: "./test/font.tff", text_position: node_stream_processor_types_1.SPEnums.TextPosition.kBottom, font_size: 9, show_date: false },
        motion: { gaussian_size: 1, scale_denominator: 3, bg_stabil_length: 9, motion_stabil_length: 2, min_pixel_diff: 10, min_changed_pixels: 0.1, motion_fps_scale: 2 },
        device: { device_type: node_stream_processor_types_1.SPEnums.DeviceType.kSpecific, device_choice: 0 }
    };
    it("should set new password and reconnect", (done) => {
        const server = new server_1.default(PORT, settings, () => { return true; });
        const client = new client_1.default("ws://localhost:8080", "cookie");
        server.events.once("ready", () => {
            client.SetPassword("New Password");
            server.events.on("password", (pwd) => {
                server.Stop();
                client.Stop();
                pwd.should.equal("New Password");
                done();
            });
        });
    }).timeout(10000);
});
//# sourceMappingURL=client_server.test.js.map