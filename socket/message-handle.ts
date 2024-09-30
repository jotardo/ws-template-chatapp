import WebSocket, {WebSocketServer} from "ws";
import {PING_DATA} from "./index";
import {SocketRequest, SocketResponse} from "./typings";
import {
    acceptFriendRequest,
    getFriendList,
    getFriendStatus,
    getMessage,
    getActiveFriendRequest,
    getUserByUsernameAndPass,
    getUserByUsername,
    registerUser,
    rejectFriendRequest,
    sendFriendRequest,
    sendMessage,
    updateReloginCode,
    getUserByUsernameAndCode,
    updateLastOnline,
    getNotFriendList,
    getPendingFriendRequest, getMessageLatest
} from "../database";

function makeid(length:number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result = result.concat(characters.charAt(Math.floor(Math.random() * charactersLength)));
        counter++;
    }
    return result;
}

interface WebSocketExt extends WebSocket {
    isAlive: boolean;
    username: string;
}

async function processMessage(wss: WebSocketServer, ws: WebSocket, data: string) {
    const currentSocket = ws as WebSocketExt;

    let request: SocketRequest|undefined;
    try {
        request = JSON.parse(data)
    } catch (e) {}

    if (!request) {
        ws.send("ERROR: Uh oh, the request is not of JSON syntax!");
        return;
    }

    let response: SocketResponse = {type: request.type, data: {success: false, message: "IDK"}};

    async function doRegister() {
        if (!request) return;
        if (!(request.data.username && request.data.password)) {
            if (!request.data.username) {
                response.data.success = false;
                response.data.message = `No "username" found.`;
            }
            if (!request.data.password) {
                response.data.success = false;
                response.data.message = `No "password" found.`;
            }
        } else {
            response.data.success = await registerUser(request.data.username, request.data.password);
            response.data.message = response.data.success ? "Successfully created" : "Server couldn't create an account right now";
        }
        ws.send(JSON.stringify(response));
    }

    async function doLogin() {
        if (!request) return;
        if (!(request.data.username && request.data.password)) {
            if (!request.data.username) {
                response.data.success = false;
                response.data.message = `No "username" found.`;
            }
            if (!request.data.password) {
                response.data.success = false;
                response.data.message = `No "password" found.`;
            }
        } else {
            let data = await getUserByUsernameAndPass(request.data.username, request.data.password);
            response.data.success = data != null && data.length == 1;
            if (response.data.success) {
                wss.clients.forEach((wsItem) => {
                    let wse = wsItem as WebSocketExt;
                    if (wse.username === request?.data.username) {
                        wse.terminate();
                        wse.username = "";
                    }
                });
                const newCode = makeid(8);
                response.data.message = `Logged in as "${request.data.username}"`;
                response.data.username = request.data.username;
                response.data.code = newCode;
                if (data) {
                    currentSocket.username = data[0].username;
                    response.data.lastLoginDate = data[0].lastOnlineDate;
                    response.data.profilePicture = data[0].profilePicture;
                }
                await updateReloginCode(request.data.username, newCode);
            } else {
                response.data.message = "Username and/or password is not correct";
            }
        }
        ws.send(JSON.stringify(response));
    }

    async function doReLogin() {
        if (!request) return;
        if (!(request.data.username && request.data.code)) {
            if (!request.data.username) {
                response.data.success = false;
                response.data.message = `No "username" found.`;
            }
            if (!request.data.code) {
                response.data.success = false;
                response.data.message = `No "code" found.`;
            }
        } else {
            let data = await getUserByUsernameAndCode(request.data.username, request.data.code);
            response.data.success = data != null && data.length == 1;
            if (response.data.success) {
                wss.clients.forEach((wsItem) => {
                    let wse = wsItem as WebSocketExt;
                    if (wse.username === request?.data.username) {
                        wse.terminate();
                        wse.username = "";
                    }
                });
                const newCode = makeid(8);
                await updateReloginCode(request.data.username, newCode);
                response.data.message = `Logged in as "${request.data.username}"`;
                response.data.username = request.data.username;
                response.data.code = newCode;
                if (data) {
                    currentSocket.username = data[0].username;
                    response.data.lastLoginDate = data[0].lastOnlineDate;
                    response.data.profilePicture = data[0].profilePicture;
                }
            } else {
                response.data.message = "Username and/or password is not correct";
            }
        }
        ws.send(JSON.stringify(response));
    }

    async function doLogout() {
        if (!request) return;
        if (currentSocket.username == null || currentSocket.username === "") {
            response.data.success = false;
            response.data.message = "You are not logged in";
        } else {
            response.data.success = true;
            response.data.message = `Successfully log out as "${currentSocket.username}"`;
            await updateLastOnline(currentSocket.username);
            currentSocket.username = "";
        }
        ws.send(JSON.stringify(response));
    }

    function doCheckStatus() {
        if (!request) return;
        if (!request.data.username) {
            response.data.success = false;
            response.data.message = `No "username" found`;
        } else {
            response.data.success = true;
            response.data.message = `Successfully get status of "${request.data.username}"`;
            response.data.username = request.data.username;
            let exists = false;
            wss.clients.forEach((wsItem) => {if ((wsItem as WebSocketExt).username === request?.data.username) {exists = true}});
            response.data.online = exists;
        }
        ws.send(JSON.stringify(response));
    }

    async function doSendMessage() {
        if (!request) return;
        if (!(request.data.to && request.data.content)) {
            if (!request.data.to) {
                response.data.success = false;
                response.data.message = `No "to" found.`;
            }
            if (!request.data.content) {
                response.data.success = false;
                response.data.message = `No "content" found.`;
            }
            ws.send(JSON.stringify(response));
        } else if (currentSocket.username == null || currentSocket.username === "") {
            response.data.success = false;
            response.data.message = "You are not logged in!";
            ws.send(JSON.stringify(response));
        } else {
            let result = await sendMessage(currentSocket.username, request.data.to, request.data.content);
            response.data.success = result;
            response.data.message = result ? `Send to "${request.data.to}" successfully.` : `Something is wrong sending message to "${request.data.to}"`;
            response.data.data = {from: currentSocket.username, to: request.data.to, content: request.data.content, at: new Date().toString()};
            ws.send(JSON.stringify(response));

            let response2: SocketResponse = {
                type: "RECEIVE_MESSAGE",
                data: {from: currentSocket.username, to: request.data.to, content: request.data.content, success: true, message: "Received a message", at: new Date().toString()}
            };
            wss.clients.forEach((wsItem) => {
                let wse = wsItem as WebSocketExt;
                if (wse.username === request?.data.to) {
                    wse.send(JSON.stringify(response2));
                }
            });
        }
    }

    async function doGetMessageLatest() {
        if (!request) return;
        if (currentSocket.username == null || currentSocket.username === "") {
            response.data.success = false;
            response.data.message = "You are not logged in!";
        }
        else if (!request.data.page) {
            response.data.success = false;
            response.data.message = `No "page" found.`;
        }
        else {
            const messageResult = await getMessageLatest(currentSocket.username, request.data.page);
            response.data.success = messageResult != null;
            response.data.message = `Get latest chat successfully.`;
            response.data.data = messageResult;
        }
        ws.send(JSON.stringify(response));
    }

    async function doGetMessage() {
        if (!request) return;
        if (!(request.data.username && request.data.page)) {
            if (!request.data.username) {
                response.data.success = false;
                response.data.message = `No "username" found.`;
            }
            if (!request.data.page) {
                response.data.success = false;
                response.data.message = `No "page" found.`;
            }
        } else if (currentSocket.username == null || currentSocket.username === "") {
            response.data.success = false;
            response.data.message = "You are not logged in!";
        } else {
            const messageResult = await getMessage(currentSocket.username, request.data.username, request.data.page);
            response.data.success = messageResult != null;
            response.data.message = messageResult != null ? `Get message with "${request.data.username}" at page ${request.data.page} successfully.` : `Get message with "${request.data.username}" at page ${request.data.page} failed.`;
            response.data.username = request.data.username;
            response.data.page = request.data.page;
            response.data.data = messageResult;
        }
        ws.send(JSON.stringify(response));
    }

    async function doGetFriends() {
        if (!request) return;
        if (currentSocket.username == null || currentSocket.username === "") {
            response.data.success = false;
            response.data.message = "You are not logged in!";
        }
        else if (!request.data.page) {
            response.data.success = false;
            response.data.message = `No "page" found.`;
        }
        else {
            const messageResult = await getFriendList(currentSocket.username, request.data.page);
            response.data.success = messageResult != null;
            response.data.message = `Get friends successfully.`;
            response.data.data = messageResult;
        }
        ws.send(JSON.stringify(response));
    }

    async function doGetNonFriends() {
        if (!request) return;
        if (currentSocket.username == null || currentSocket.username === "") {
            response.data.success = false;
            response.data.message = "You are not logged in!";
        }
        else if (!request.data.page) {
            response.data.success = false;
            response.data.message = `No "page" found.`;
        }
        else {
            const messageResult = await getNotFriendList(currentSocket.username, request.data.page);
            response.data.success = messageResult != null;
            response.data.message = `Get suggestion successfully.`;
            response.data.data = messageResult;
        }
        ws.send(JSON.stringify(response));
    }

    async function doCheckFriendStatus() {
        if (!request) return;
        if (!request.data.username) {
            response.data.success = false;
            response.data.message = `No "username" found.`;
        }
        else if (currentSocket.username == null || currentSocket.username === "") {
            response.data.success = false;
            response.data.message = "You are not logged in!";
        }
        else {
            const user1 = await getUserByUsername(request.data.username);
            if (user1 === null) {
                response.data.success = false;
                response.data.message = `Can't find user "${request.data.username}"`;
            }
            else {
                const messageResult = await getFriendStatus(currentSocket.username, request.data.username);
                response.data.success = messageResult != null;
                response.data.message = `Get friend status successfully.`;
                response.data.username = request.data.username;
                response.data.state = messageResult;
            }
        }
        ws.send(JSON.stringify(response));
    }

    async function doGetFriendRequest() {
        if (!request) return;
        if (currentSocket.username == null || currentSocket.username === "") {
            response.data.success = false;
            response.data.message = "You are not logged in!";
        }
        else if (!request.data.page) {
            response.data.success = false;
            response.data.message = `No "page" found.`;
        }
        else {
            const messageResult = await getActiveFriendRequest(currentSocket.username, request.data.page);
            response.data.success = messageResult != null;
            response.data.message = `Get active friend request successfully.`;
            response.data.data = messageResult;
        }
        ws.send(JSON.stringify(response));
    }

    async function doGetPendingFriendRequest() {
        if (!request) return;
        if (currentSocket.username == null || currentSocket.username === "") {
            response.data.success = false;
            response.data.message = "You are not logged in!";
        }
        else if (!request.data.page) {
            response.data.success = false;
            response.data.message = `No "page" found.`;
        }
        else {
            const messageResult = await getPendingFriendRequest(currentSocket.username, request.data.page);
            response.data.success = messageResult != null;
            response.data.message = `Get pending friend request successfully.`;
            response.data.data = messageResult;
        }
        ws.send(JSON.stringify(response));
    }

    async function doSendFriendRequest() {
        if (!request) return;
        if (!request.data.to) {
            response.data.success = false;
            response.data.message = `No "to" found.`;
            ws.send(JSON.stringify(response));
        } else if (currentSocket.username == null || currentSocket.username === "") {
            response.data.success = false;
            response.data.message = "You are not logged in!";
            ws.send(JSON.stringify(response));
        } else {
            let exists = await getUserByUsername(request.data.to);
            if (exists === null) {
                response.data.success = false;
                response.data.message = "No user founded!";
                ws.send(JSON.stringify(response));
            }
            else {
                let friend_status = await getFriendStatus(currentSocket.username, request.data.to);
                if (friend_status === 0 || friend_status === 1) {
                    response.data.success = false;
                    response.data.message = friend_status === 0 ? `You have sent friend request to "${request.data.to}" already` : "You have them as friend already";
                    ws.send(JSON.stringify(response));
                }
                else {
                    let result = await sendFriendRequest(currentSocket.username, request.data.to);
                    response.data.success = result;
                    response.data.username = request.data.to;
                    response.data.message = result ? `Send friend request to "${request.data.to}" successfully.` : `Something is wrong sending friend request to "${request.data.to}"`;
                    ws.send(JSON.stringify(response));

                    let response2: SocketResponse = {
                        type: "RECEIVE_FRIEND_REQUEST",
                        data: {from: exists, success: true, message: "Received a friend request"}
                    };
                    wss.clients.forEach((wsItem) => {
                        let wse = wsItem as WebSocketExt;
                        if (wse.username === request?.data.to) {
                            wse.send(JSON.stringify(response2));
                        }
                    });
                }

            }
        }
    }

    async function doAcceptFriendRequest() {
        if (!request) return;
        if (!request.data.from) {
            response.data.success = false;
            response.data.message = `No "from" found.`;
            ws.send(JSON.stringify(response));
        } else if (currentSocket.username == null || currentSocket.username === "") {
            response.data.success = false;
            response.data.message = "You are not logged in!";
            ws.send(JSON.stringify(response));
        } else {
            let friend_status = await getFriendStatus(currentSocket.username, request.data.from);
            if (friend_status === -1) {
                response.data.success = false;
                response.data.message = "No user founded in request!";
                ws.send(JSON.stringify(response));
            }
            else if (friend_status === 1 || friend_status === 2) {
                response.data.success = false;
                response.data.message = friend_status === 2 ? "Friend request has been rejected already" : "You have them as friend already";
                ws.send(JSON.stringify(response));
            }
            else {
                let result = await acceptFriendRequest(request.data.from, currentSocket.username);
                response.data.success = result;
                response.data.username = request.data.from;
                response.data.message = result ? `Accept friend request from "${request.data.from}" successfully.` : `Something is wrong sending message to "${request.data.from}"`;
                ws.send(JSON.stringify(response));

                let response2: SocketResponse = {
                    type: "ACCEPT_FRIEND_REQUEST",
                    data: {from: request.data.from, to: currentSocket.username, success: true, message: `You and "${request.data.from}" became friends`}
                };
                wss.clients.forEach((wsItem) => {
                    let wse = wsItem as WebSocketExt;
                    if (wse.username === request?.data.from) {
                        wse.send(JSON.stringify(response2));
                    }
                });
            }
        }
    }

    async function doRejectFriendRequest() {
        if (!request) return;
        if (!request.data.from) {
            response.data.success = false;
            response.data.message = `No "from" found.`;
            ws.send(JSON.stringify(response));
        } else if (currentSocket.username == null || currentSocket.username === "") {
            response.data.success = false;
            response.data.message = "You are not logged in!";
            ws.send(JSON.stringify(response));
        } else {
            let friend_status = await getFriendStatus(currentSocket.username, request.data.from);
            if (friend_status === -1) {
                response.data.success = false;
                response.data.message = "No user founded in request!";
                ws.send(JSON.stringify(response));
            }
            else if (friend_status === 1 || friend_status === 2) {
                response.data.success = false;
                response.data.message = friend_status === 2 ? `Friend request has been rejected already` : "You have them as friend already";
                ws.send(JSON.stringify(response));
            }
            else {
                let result = await rejectFriendRequest(request.data.from, currentSocket.username);
                response.data.success = result;
                response.data.username = request.data.from;
                response.data.message = result ? `Rejected friend request from  "${request.data.from}" successfully.` : `Something is wrong rejecting "${request.data.from}" friend request`;
                ws.send(JSON.stringify(response));

                let response2: SocketResponse = {
                    type: "REJECT_FRIEND_REQUEST",
                    data: {from: request.data.from, to: currentSocket.username, success: true, message: `"${request.data.from}" has reject your friend request`}
                };
                wss.clients.forEach((wsItem) => {
                    let wse = wsItem as WebSocketExt;
                    if (wse.username === request?.data.from) {
                        wse.send(JSON.stringify(response2));
                    }
                });
            }
        }
    }

    if (request.type === "REGISTER") {
        await doRegister();
    } else if (request.type === "LOGIN") {
        await doLogin();
    } else if (request.type === "RE_LOGIN") {
        await doReLogin();
    } else if (request.type === "LOGOUT") {
        await doLogout();
    } else if (request.type === "CHECK_STATUS") {
        doCheckStatus();
    } else if (request.type === "SEND_MESSAGE") {
        await doSendMessage();
    } else if (request.type === "GET_MESSAGE") {
        await doGetMessage();
    } else if (request.type === "GET_MESSAGE_LATEST") {
        await doGetMessageLatest();
    } else if (request.type === "GET_FRIEND_LIST") {
        await doGetFriends();
    } else if (request.type === "GET_FRIEND_SUGGESTION") {
        await doGetNonFriends();
    } else if (request.type === "GET_FRIEND_REQUEST") {
        await doGetFriendRequest();
    } else if (request.type === "GET_PENDING_REQUEST") {
        await doGetPendingFriendRequest();
    } else if (request.type === "CHECK_FRIEND_STATUS") {
        await doCheckFriendStatus();
    } else if (request.type === "SEND_FRIEND_REQUEST") {
        await doSendFriendRequest();
    } else if (request.type === "ACCEPT_FRIEND_REQUEST") {
        await doAcceptFriendRequest();
    } else if (request.type === "REJECT_FRIEND_REQUEST") {
        await doRejectFriendRequest();
    } else {
        response.data.success = false;
        response.data.message = "Request type is not supported";
        ws.send(JSON.stringify(response));
    }
}

export const onSocketMessage = (wss: WebSocketServer, ws: WebSocketExt, msg: WebSocket.RawData, isBinary: boolean) => {
    if (isBinary && (msg as any)[0] === PING_DATA) {
        console.log("WS connection is alive", ws.username);
        ws.isAlive = true;
    } else {
        processMessage(wss, ws, msg.toString()).finally(() => {});
    }
}