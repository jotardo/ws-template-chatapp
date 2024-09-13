import mysql, {ConnectionOptions, Pool, ResultSetHeader, RowDataPacket} from "mysql2/promise";
import {Message, User} from "./typings";

let connection:Pool;

// User
const querySelectUserAndRelogin:string = "SELECT `id`, `username`, `creationDate`, `reloginCode` FROM `user` WHERE `username` = ? AND `reloginCode` = ?";
const queryAddUser:string = "INSERT INTO `user`(`username`, `password`, `creationDate`) VALUES (?, ?, NOW())";
const querySelectUserAndPass:string = "SELECT `id`, `username`, `creationDate`, `reloginCode` FROM `user` WHERE `username` = ? AND `password` = ?";
const querySelectUser:string = "SELECT `id`, `username`, `reloginCode`, `creationDate`, `lastOnlineDate` FROM `user` WHERE `username` = ?";
const queryUpdateReloginCode:string = "UPDATE `user` SET `reloginCode` = ? WHERE `id` = ?";
const queryUpdateLastOnline:string = "UPDATE `user` SET `lastOnlineDate` = NOW() WHERE `id` = ?";
// Messages
const queryAddMessage:string = "INSERT INTO `message`(`from`, `to`, `content`) VALUES (?, ?, ?)";
const queryGetMessageInPages:string = "SELECT m.`id`, u1.`username` `from`, u2.`username` `to`, `content`, `at` FROM `message` m INNER JOIN `user` u1 ON m.`from` = u1.`id` INNER JOIN `user` u2 ON m.`to` = u2.`id`  WHERE (`from` = ? AND `to` = ?) OR (`from` = ? AND `to` = ?) ORDER BY `at` DESC LIMIT ? OFFSET ?";
// Friends
const queryGetFriendList:string = "SELECT u.`id`, u.`username`, u.`creationDate`, u.`lastOnlineDate` FROM `user` u INNER JOIN `friend` f ON u.`id` = f.`to` WHERE f.`accepted` = 1 AND f.`from` = ? " +
    " UNION " +
    "SELECT u.`id`, u.`username`, u.`creationDate`, u.`lastOnlineDate` FROM `user` u INNER JOIN `friend` f ON u.`id` = f.`from` WHERE f.`accepted` = 1 AND f.`to` = ?   ORDER BY `creationDate` DESC LIMIT ? OFFSET ?";
const queryGetFriendStatus:string = "SELECT `accepted` FROM `friend` WHERE (`from` = ? AND `to` = ?) OR (`from` = ? AND `to` = ?) ORDER BY `creationDate` DESC LIMIT 1";
const queryGetPendingFriendRequestList:string = "SELECT u.`id`, u.`username`, u.`creationDate` FROM `friend` f INNER JOIN `user` u ON f.`from` = u.`id` WHERE f.`accepted` = 0 AND f.`to` = ? ORDER BY f.`creationDate` DESC LIMIT ? OFFSET ?";

const queryCreateFriendRequest:string = "INSERT INTO `friend`(`from`, `to`, `accepted`, `creationDate`) VALUES (?, ?, 0, NOW())";
const queryCancelFriendRequest:string = "UPDATE `friend` SET `accepted` = 2 WHERE `accepted` = 0 AND `from` = ? AND `to` = ?";
const queryAcceptFriendRequest:string = "UPDATE `friend` SET `accepted` = 1 WHERE `accepted` = 0 AND `from` = ? AND `to` = ?";

export function configureDatabase(config:ConnectionOptions) {
    connection = mysql.createPool(config);
}

export async function registerUser(username:string, password:string) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return false;
    }

    try {
        let user = await getUserByUsername(username);
        if (user) return false;
        let [result] = await connection.query<ResultSetHeader>(queryAddUser, [username, password]);
        return result.affectedRows === 1;
    }
    catch (e) {
        console.error(e);
        return false;
    }
}

export async function getUserByUsernameAndPass(username:string, password:string) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return null;
    }

    try {
        let [result] = await connection.query<RowDataPacket[]>(querySelectUserAndPass, [username, password]);
        return result as User[];
    }
    catch (e) {
        console.error(e);
        return null;
    }
}

export async function getUserByUsernameAndCode(username:string, code:string) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return null;
    }

    try {
        let [result] = await connection.query<RowDataPacket[]>(querySelectUserAndRelogin, [username, code]);
        return result as User[];
    }
    catch (e) {
        console.error(e);
        return null;
    }
}

export async function getUserByUsername(username:string) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return null;
    }

    try {
        let [result] = await connection.query<RowDataPacket[]>(querySelectUser, [username]);
        if (result.length !== 1)
            return null;
        return result[0] as User;
    }
    catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateReloginCode(username:string, code:string) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return false;
    }

    try {
        let id1 = await getUserByUsername(username);
        let [result] = await connection.query<ResultSetHeader>(queryUpdateReloginCode, [code, id1?.id]);
        return result.affectedRows === 1;
    }
    catch (e) {
        console.error(e);
        return false;
    }
}

export async function updateLastOnline(username:string) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return false;
    }

    try {
        let id1 = await getUserByUsername(username);
        let [result] = await connection.query<ResultSetHeader>(queryUpdateLastOnline, [id1?.id]);
        return result.affectedRows === 1;

    }
    catch (e) {
        console.error(e);
        return false;
    }
}

export async function sendMessage(fromUsername:string, toUsername:string, message:string) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return false;
    }
    try {
        let fromID = await getUserByUsername(fromUsername);
        let toID = await getUserByUsername(toUsername);
        let [result] = await connection.query<ResultSetHeader>(queryAddMessage, [fromID?.id, toID?.id, message]);
        return result.affectedRows === 1;
    }
    catch (e) {
        console.error(e);
        return false;
    }
}

export async function getMessage(username1:string, username2:string, page:number) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return null;
    }
    try {
        let id1 = await getUserByUsername(username1);
        let id2 = await getUserByUsername(username2);
        let [result] = await connection.query<RowDataPacket[]>(queryGetMessageInPages, [id1?.id, id2?.id, id2?.id, id1?.id, 50, 50 * (page - 1)]);
        return result as Message[];
    }
    catch (e) {
        console.error(e);
        return null;
    }
}

export async function getFriendList(username:string, page:number) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return null;
    }

    try {
        let id1 = await getUserByUsername(username);
        let [result] = await connection.query<RowDataPacket[]>(queryGetFriendList, [id1?.id, id1?.id, 10, 10 * (page - 1)]);
        return result as User[];
    }
    catch (e) {
        console.error(e);
        return null;
    }
}

export async function getFriendStatus(username1:string, username2:string) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return -1;
    }

    try {
        let id1 = await getUserByUsername(username1);
        let id2 = await getUserByUsername(username2);
        if (id1 === id2)
            return -1;
        let [result] = await connection.query<RowDataPacket[]>(queryGetFriendStatus, [id1?.id, id2?.id, id2?.id, id1?.id]);
        if (result.length !== 1)
            return -1;
        return result[0].accepted as number;
    }
    catch (e) {
        console.error(e);
        return -1;
    }
}

export async function getPendingFriendRequest(username:string, page:number) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return null;
    }

    try {
        let id = await getUserByUsername(username);
        let [result] = await connection.query<RowDataPacket[]>(queryGetPendingFriendRequestList, [id?.id, 10, 10 * (page - 1)]);
        return result;
    }
    catch (e) {
        console.error(e);
        return null;
    }
}

export async function sendFriendRequest(fromUsername:string, toUsername:string) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return false;
    }
    try {
        let fromID = await getUserByUsername(fromUsername);
        let toID = await getUserByUsername(toUsername);
        if (fromID?.id === toID?.id)
            return false;
        let [result] = await connection.query<ResultSetHeader>(queryCreateFriendRequest, [fromID?.id, toID?.id]);
        return result.affectedRows === 1;
    }
    catch (e) {
        console.error(e);
        return false;
    }
}

export async function acceptFriendRequest(fromUsername:string, toUsername:string) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return false;
    }
    try {
        let fromID = await getUserByUsername(fromUsername);
        let toID = await getUserByUsername(toUsername);
        if (fromID?.id === toID?.id)
            return false;
        let [result] = await connection.query<ResultSetHeader>(queryAcceptFriendRequest, [fromID?.id, toID?.id]);
        return result.affectedRows === 1;
    }
    catch (e) {
        console.error(e);
        return false;
    }
}

export async function rejectFriendRequest(fromUsername:string, toUsername:string) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return false;
    }
    try {
        let fromID = await getUserByUsername(fromUsername);
        let toID = await getUserByUsername(toUsername);
        if (fromID?.id === toID?.id)
            return false;
        let [result] = await connection.query<ResultSetHeader>(queryCancelFriendRequest, [fromID?.id, toID?.id]);
        return result.affectedRows === 1;
    }
    catch (e) {
        console.error(e);
        return false;
    }
}