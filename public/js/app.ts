(function () {
    interface WebSocketExt extends WebSocket {
        pingTimeout: NodeJS.Timeout;
    }
    let ws: WebSocketExt | null;
    const PING_TIMEOUT = 1000 * 10 + 1000 * 1;
    const PING_DATA = 1;
    const messages = <HTMLElement>document.getElementById('messages');
    const wsOpen = <HTMLButtonElement>document.getElementById('ws-open');
    const wsClose = <HTMLButtonElement>document.getElementById('ws-close');
    const wsInput = <HTMLTextAreaElement>document.getElementById('ws-input');
    const wsClear = <HTMLTextAreaElement>document.getElementById('ws-clear');
    const wsMessage = <HTMLFormElement>document.getElementById('ws-message');

    const wsLogin = <HTMLButtonElement>document.getElementById('ws-login');
    const wsReLogin = <HTMLButtonElement>document.getElementById('ws-relogin');
    const wsRegister = <HTMLButtonElement>document.getElementById('ws-register');
    const wsLogout = <HTMLButtonElement>document.getElementById('ws-logout');
    const wsSendMessage = <HTMLButtonElement>document.getElementById('ws-send-message');
    const wsGetMessage = <HTMLButtonElement>document.getElementById('ws-get-message');
    const wsGetFriend = <HTMLButtonElement>document.getElementById('ws-get-friend');
    const wsGetFriendRequest = <HTMLButtonElement>document.getElementById('ws-get-friend-request');
    const wsSendFriendRequest = <HTMLButtonElement>document.getElementById('ws-send-friend-request');
    const wsAcceptFriendRequest = <HTMLButtonElement>document.getElementById('ws-accept-friend-request');
    const wsRejectFriendRequest = <HTMLButtonElement>document.getElementById('ws-reject-friend-request');
    const wsCheckFriendStatus = <HTMLButtonElement>document.getElementById('ws-check-friend-status');
    const wsCheckStatus = <HTMLButtonElement>document.getElementById('ws-check-status');
    const wsGetFriendSuggest = <HTMLButtonElement>document.getElementById('ws-get-friend-suggest');

    function ping() {
        if (!ws) return;
        if (ws.pingTimeout) clearTimeout(ws.pingTimeout);
        ws.pingTimeout = setTimeout(() => {
            if (ws) ws.close();
        }, PING_TIMEOUT);

        const data = new Uint8Array(1);
        data[0] = PING_DATA;
        ws.send(data);
    }

    function isBinary(obj: any) {
        return typeof obj === 'object' && Object.prototype.toString.call(obj) === '[object Blob]';
    }

    function showMessage(message: string, response:boolean = true) {
        if (!messages) {
            return;
        }

        messages.innerHTML += response ? `<span style="color: red">${message}\n</span>` : `${message}\n`;
        messages.scrollTop = messages?.scrollHeight;
    }

    function closeConnection() {
        if (!!ws) {
            ws.close();
        }
    }

    wsOpen.addEventListener('click', () => {
        closeConnection();

        ws = new WebSocket('ws://localhost:4000/chat') as WebSocketExt;

        ws.addEventListener('error', () => {
            showMessage('WebSocket error');
        });

        ws.addEventListener('open', () => {
            showMessage('WebSocket connection established');
        });

        ws.addEventListener('close', () => {
            if (!ws) return;
            if (ws.pingTimeout) clearTimeout(ws.pingTimeout);
            showMessage('WebSocket connection closed');
            ws = null;
        });

        ws.addEventListener('message', (msg: MessageEvent<string>) => {
            if (isBinary(msg.data))
                ping()
            else
                showMessage(`Received message: ${msg.data}`);
        });
    });

    wsClose.addEventListener('click', closeConnection);

    // wsSend.addEventListener('click', () => {
    //     const val = wsInput?.value;
    //
    //     if (!val) {
    //         return;
    //     }
    //     if (!ws) {
    //         showMessage('No WebSocket connection');
    //         return;
    //     }
    //
    //     ws.send(val);
    //     showMessage(`Sent "${val}"`);
    //     wsInput.value = '';
    // });

    wsMessage.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = wsInput?.value;

        if (!val) {
            return;
        }
        if (!ws) {
            showMessage('No WebSocket connection');
            return;
        }

        ws.send(val);
        showMessage(`Sent "${val}"`, false);
        wsInput.value = '';
    })

    wsClear.addEventListener('click', ()=> messages.innerHTML = "");

    wsLogin.addEventListener('click', () => wsInput.value = JSON.stringify({type:"LOGIN", data: {username:"", password: ""}}))
    wsReLogin.addEventListener('click', () => wsInput.value = JSON.stringify({type:"RE_LOGIN", data: {username:"", code: ""}}))
    wsRegister.addEventListener('click', () => wsInput.value = JSON.stringify({type:"REGISTER", data: {username:"", password: ""}}))
    wsLogout.addEventListener('click', () => wsInput.value = JSON.stringify({type:"LOGOUT"}))
    wsSendMessage.addEventListener('click', () => wsInput.value = JSON.stringify({type:"SEND_MESSAGE", data: {to:"", content: ""}}))
    wsGetMessage.addEventListener('click', () => wsInput.value = JSON.stringify({type:"GET_MESSAGE", data: {username:"", page: 1}}))
    wsGetFriend.addEventListener('click', () => wsInput.value = JSON.stringify({type:"GET_FRIEND_LIST", data: {page: 1}}))
    wsGetFriendSuggest.addEventListener('click', () => wsInput.value = JSON.stringify({type:"GET_FRIEND_SUGGESTION", data: {page: 1}}))
    wsGetFriendRequest.addEventListener('click', () => wsInput.value = JSON.stringify({type:"GET_FRIEND_REQUEST", data: {page: 1}}))
    wsSendFriendRequest.addEventListener('click', () => wsInput.value = JSON.stringify({type:"SEND_FRIEND_REQUEST", data: {to:""}}))
    wsAcceptFriendRequest.addEventListener('click', () => wsInput.value = JSON.stringify({type:"ACCEPT_FRIEND_REQUEST", data: {from:""}}))
    wsRejectFriendRequest.addEventListener('click', () => wsInput.value = JSON.stringify({type:"REJECT_FRIEND_REQUEST", data: {from:""}}))
    wsCheckFriendStatus.addEventListener('click', () => wsInput.value = JSON.stringify({type:"CHECK_FRIEND_STATUS", data: {username:""}}))
    wsCheckStatus.addEventListener('click', () => wsInput.value = JSON.stringify({type:"CHECK_STATUS", data: {username:""}}))

})();