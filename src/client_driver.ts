import WebClient from "./client";

declare global {
  interface Window {
    CreateWebClient: (address: string, cookie: string) => WebClient;
  }
}

window.CreateWebClient = (address: string, cookie: string) => {
  return new WebClient(address, cookie);
};