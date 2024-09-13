import WebSocket, {WebSocketServer} from "ws";
import {Server} from "http";
import {onSocketMessage} from "./message-handle";

export const PING_INTERVAL = 1000 * 10;
export const PING_DATA = 1;

interface WebSocketExt extends WebSocket {
    isAlive: boolean;
    username: string,
}

export default function configureSocket(server: Server) {
    let interval:NodeJS.Timeout;
    const wss = new WebSocketServer({noServer: true, path: "/chat"});
    const onSocketPreError = (err: Error) => console.warn(err);
    const onSocketPostError = (err: Error) => console.error(err);
    const onSocketClose = () => {
        console.log("Connection closed");
    }
    const ping = (websocket:WebSocket) => {
        websocket.send(PING_DATA, {binary:true});
    }

    // "Upgrade": http requests turn to socket request
    server.on('upgrade', (request, socket, head) => {
        // Throw error from HTTP request
        socket.on('error', onSocketPreError);
        // Perform Authentication
        if (!!request.headers['BadAuth']) {
            socket.write('WHAT THE FUCK, BAD AUTH DETECTED. DESTROYING SOCKET');
            socket.destroy();
            return;
        }
        // It is good, so I should upgrade from socket to websocket
        wss.handleUpgrade(request, socket, head, (websocket) => {
            socket.removeListener('error', onSocketPreError);
            wss.emit('connection', websocket, request);
        });
    });

    // on server closing: remove
    server.on('close', () => clearInterval(interval));

    wss.on('connection', (ws:WebSocketExt, request) => {
        console.log("Connected to a client");

        ws.isAlive = true;
        // Throw error from WebSocket
        ws.on('error', onSocketPostError);
        ws.on('message', (data, isBinary) => onSocketMessage(wss, ws, data, isBinary));
        ws.on('close', () => {
            ws.username = "";
            onSocketClose();
        });
    });

    interval = setInterval(() => {
        //console.log("firing checking socket alive")
        wss.clients.forEach((client) => {
            const tmpClient = client as WebSocketExt;
            if (!tmpClient.isAlive) {
                console.log("A client is not alive, destroy that client connection");
                client.terminate();
                return;
            }
            tmpClient.isAlive = false;
            ping(client);
        });
    }, PING_INTERVAL);
}