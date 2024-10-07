export interface User {
    id: number,
    username: string,
    password: string,
    creationDate: Date,
    lastOnlineDate: Date,
    reloginCode: string,
    firstName:string,
    lastName:string,
    profilePicture: string,
}

export type Message = {
    id: number,
    from: number,
    to: number,
    content: string,
    at: Date,
}