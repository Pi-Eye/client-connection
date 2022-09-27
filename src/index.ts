import path from "path";

import WebClient from "./client";
import ServerSide from "./server";
import { ServerSideEvents } from "./types";

const ClientBundlePath = path.join(__dirname, "bundle.js");

export { WebClient, ServerSide, ServerSideEvents, ClientBundlePath }; 