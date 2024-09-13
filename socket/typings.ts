export type RequestType = 'LOGIN' | 'RE_LOGIN' | 'REGISTER' | 'LOGOUT'| 'CHECK_STATUS' |
    'SEND_MESSAGE' | 'RECEIVE_MESSAGE' | 'GET_MESSAGE' | 'GET_ALL_USER' |
    'GET_FRIEND_LIST' | 'CHECK_FRIEND_STATUS' | 'GET_FRIEND_REQUEST' |
    'SEND_FRIEND_REQUEST' | 'RECEIVE_FRIEND_REQUEST' | 'ACCEPT_FRIEND_REQUEST' | 'REJECT_FRIEND_REQUEST';

export type SocketRequest = {
    "type": RequestType,
    "data": {
        [key:string]: any,
    },
}

export type SocketResponse = {
    "type": RequestType,
    "data": {
        "success": boolean,
        "message": string,
        [key:string]: any,
    },
}