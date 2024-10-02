import express from 'express';
import configureRouter from './routers';
import configureSocket from "./socket";
import {configureDatabase} from "./database";
import {ClientConfig} from "pg";
import {ExpressPeerServer, IConfig} from "peer";

// Variables
const app = express();
const ws_port = process.env.WS_PORT || 3000;
const peer_port = process.env.PEER_PORT || 9000;
const db_config:ClientConfig = {
    host: process.env.DB_URL || "localhost",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS || "12345",
    database: process.env.DB_NAME || "chatapp",
    port: parseInt(process.env.DB_PORT || "5432"),
    query_timeout: 3000,
    ssl: {
        rejectUnauthorized: false
    }
};
const peer_config:Partial<IConfig> = {
    path: '/call',
};
const wsServer = app.listen(ws_port, () => {
    console.log(`WebSocket Listening on port ${ws_port}`);
});
const peerBaseServer = app.listen(peer_port, () => {
    console.log(`PeerJS Server Listening on port ${peer_port}`);
});
const peerJSServer = ExpressPeerServer(peerBaseServer, peer_config);

// PeerJS Server
app.use('/', peerJSServer);

// Configuration
configureDatabase(db_config).finally(() => {
    configureRouter(app);
    configureSocket(wsServer);
});
console.log(`Attempting to run WS server on port ${ws_port} and PeerJS server on port ${peer_port}`);