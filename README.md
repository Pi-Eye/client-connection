# Client Connection Server

## About

Server side code for connecting with Pi-Eye server

### Built With

* NodeJS
* TypeScript

## Getting Started

### Prerequisites

1. [Node](https://nodejs.org/en/) and npm

### Installation

1. Install NPM package: client-connection-server
    ```sh
    npm install https://github.com/Pi-Eye/client-connection-server
    ```

## Usage

### Example Client Connection Serverside

```js
import https from "https";
import ServerSide from "client-connection-server";

const httpsServer;          // https server, setup on port and with certificates

async function auth_function(cookie: string) {      // some auth function taking in a string, returning true for success, false for fail
    return true;
}

const server_side = new CameraSide(httpsServer, auth_function);
```

## License

Distributed uner the GPL-3.0 License. See `LICENSE.txt` for more information.

## Contact

Bennett Wu - bwu1324@gmail.com