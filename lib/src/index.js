"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientBundlePath = exports.ServerSide = exports.WebClient = void 0;
const path_1 = __importDefault(require("path"));
const client_1 = __importDefault(require("./client"));
exports.WebClient = client_1.default;
const server_1 = __importDefault(require("./server"));
exports.ServerSide = server_1.default;
const ClientBundlePath = path_1.default.join(__dirname, "bundle.js");
exports.ClientBundlePath = ClientBundlePath;
//# sourceMappingURL=index.js.map