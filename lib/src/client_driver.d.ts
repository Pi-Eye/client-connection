import WebClient from "./client";
declare global {
    interface Window {
        CreateWebClient: (address: string, cookie: string) => WebClient;
    }
}
