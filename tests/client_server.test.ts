import crypto from "crypto";
import { SPEnums } from "node-stream-processor-types";

import WebClient from "../src/client";
import ServerSide from "../src/server";
import { AllSettings } from "camera-interface";

const PORT = 8080;

describe("Initialization", () => {
  const settings: AllSettings = {
    camera: { width: 640, height: 480, format: SPEnums.Format.kRGB, quality: 75 },
    text: { font_path: "./test/font.tff", text_position: SPEnums.TextPosition.kBottom, font_size: 9, show_date: false },
    motion: { gaussian_size: 1, scale_denominator: 3, bg_stabil_length: 9, motion_stabil_length: 2, min_pixel_diff: 10, min_changed_pixels: 0.1, motion_fps_scale: 2 },
    device: { device_type: SPEnums.DeviceType.kSpecific, device_choice: 0 }
  };
  it("should fail if wrong password provided", (done) => {
    const server = new ServerSide(PORT, settings, (cookie) => { return cookie === "cookie"; });
    const client = new WebClient("ws://localhost:8080", "password");

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
    const server = new ServerSide(PORT, settings, (cookie) => { return cookie === "cookie"; });
    const client = new WebClient("ws://localhost:8080", "cookie");

    server.events.on("ready", () => {
      server.Stop();
      client.Stop();
      done();
    });
  });

  it("should send camera settings once authenticated", (done) => {
    const server = new ServerSide(PORT, settings, (cookie) => { return cookie === "cookie"; });
    const client = new WebClient("ws://localhost:8080", "cookie");

    client.events.on("ready", (set: AllSettings) => {
      server.Stop();
      client.Stop();
      JSON.stringify(set).should.equal(JSON.stringify(settings));
      done();
    });
  });
});

describe("Send Messages", () => {
  const settings: AllSettings = {
    camera: { width: 640, height: 480, format: SPEnums.Format.kRGB, quality: 75 },
    text: { font_path: "./test/font.tff", text_position: SPEnums.TextPosition.kBottom, font_size: 9, show_date: false },
    motion: { gaussian_size: 1, scale_denominator: 3, bg_stabil_length: 9, motion_stabil_length: 2, min_pixel_diff: 10, min_changed_pixels: 0.1, motion_fps_scale: 2 },
    device: { device_type: SPEnums.DeviceType.kSpecific, device_choice: 0 }
  };

  it("should successfully send frame", (done) => {
    const server = new ServerSide(PORT, settings, () => { return true; });
    const client = new WebClient("ws://localhost:8080", "cookie");

    const frame = crypto.randomBytes(100);
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
    const server = new ServerSide(PORT, settings, () => { return true; });
    const client = new WebClient("ws://localhost:8080", "cookie");

    const new_settings: AllSettings = {
      camera: { width: 320, height: 240, format: SPEnums.Format.kGray, quality: 50 },
      text: { font_path: "./test/other/font.tff", text_position: SPEnums.TextPosition.kTop, font_size: 18, show_date: true },
      motion: { gaussian_size: 3, scale_denominator: 2, bg_stabil_length: 13, motion_stabil_length: 1, min_pixel_diff: 5, min_changed_pixels: 0.11, motion_fps_scale: 3 },
      device: { device_type: SPEnums.DeviceType.kGPU, device_choice: 1 }
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
  const settings: AllSettings = {
    camera: { width: 640, height: 480, format: SPEnums.Format.kRGB, quality: 75 },
    text: { font_path: "./test/font.tff", text_position: SPEnums.TextPosition.kBottom, font_size: 9, show_date: false },
    motion: { gaussian_size: 1, scale_denominator: 3, bg_stabil_length: 9, motion_stabil_length: 2, min_pixel_diff: 10, min_changed_pixels: 0.1, motion_fps_scale: 2 },
    device: { device_type: SPEnums.DeviceType.kSpecific, device_choice: 0 }
  };

  it("should set new password and reconnect", (done) => {
    const server = new ServerSide(PORT, settings, () => { return true; });
    const client = new WebClient("ws://localhost:8080", "cookie");

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