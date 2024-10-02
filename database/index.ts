// import mysql, {ConnectionOptions, Pool, ResultSetHeader, RowDataPacket} from "mysql2/promise";
import pg from "pg";
import {Message, User} from "./typings";
const { Client } = pg
let connection: pg.Client;

// User
const querySelectUserAndRelogin:string = "SELECT id, username, lastOnlineDate, profilePicture, reloginCode FROM \"user\" WHERE username = $1 AND reloginCode = $2";
const queryAddUser:string = "INSERT INTO \"user\"(username, password, creationDate) VALUES ($1, $2, NOW())";
const querySelectUserAndPass:string = "SELECT id, username, lastOnlineDate, reloginCode, profilePicture FROM \"user\" WHERE username = $1 AND password = $2";
const querySelectUser:string = "SELECT id, username, reloginCode, creationDate, lastOnlineDate FROM \"user\" WHERE username = $1";
const queryUpdateReloginCode:string = "UPDATE \"user\" SET reloginCode = $1 WHERE id = $2";
const queryUpdateLastOnline:string = "UPDATE \"user\" SET lastOnlineDate = NOW() WHERE id = $1";
// Messages
const queryAddMessage:string = "INSERT INTO \"message\"(\"from\", \"to\", content) VALUES ($1, $2, $3)";
const queryGetMessageInPages:string = "SELECT m.id, u1.username \"from\", u2.username \"to\", content, at FROM \"message\" m INNER JOIN \"user\" u1 ON m.\"from\" = u1.id INNER JOIN \"user\" u2 ON m.\"to\" = u2.id  WHERE deleted = 0 AND (\"from\" = $1 AND \"to\" = $2) OR (\"from\" = $3 AND \"to\" = $4) ORDER BY at DESC LIMIT $5 OFFSET $6";
const queryGetMessageLatest:string = "SELECT u.username, u.profilePicture, u.lastOnlineDate, m.* FROM \"message\" m RIGHT JOIN \"user\" u ON (m.\"to\" = u.id AND m.\"from\" = $1) OR (m.\"from\" = u.id AND m.\"to\" = $2) WHERE deleted = 0 AND at IN (SELECT MAX(at) at FROM(SELECT \"to\" \"id\", MAX(at) at FROM \"message\" WHERE \"from\" = $3 GROUP BY \"to\" UNION SELECT \"from\" \"id\", MAX(at) at FROM \"message\" WHERE \"to\" = $4 GROUP BY \"from\") AS list GROUP BY list.id) ORDER BY at DESC LIMIT $5 OFFSET $6";
// Friends
const queryGetFriendList:string = "SELECT DISTINCT u.id, u.username, u.creationDate, u.lastOnlineDate, u.profilePicture FROM \"user\" u RIGHT JOIN \"friend\" f ON u.id = f.\"to\" LEFT JOIN \"friend\" f2 on u.id = f2.\"from\" WHERE (f.\"from\" = $1 AND f.accepted = 1) OR (f2.\"to\" = $2 AND f2.accepted = 1) ORDER BY u.creationDate DESC LIMIT $3 OFFSET $4";
const queryGetNotFriendSelect:string = "SELECT u.id, u.username, u.creationDate, u.lastOnlineDate, u.profilePicture FROM \"user\" u WHERE u.id != $1 AND u.id NOT IN (SELECT DISTINCT u.id FROM \"user\" u RIGHT JOIN \"friend\" f ON u.id = f.\"to\" LEFT JOIN \"friend\" f2 on u.id = f2.\"from\"  WHERE (f.\"from\" = $2 AND (f.accepted = 1 OR f.accepted = 0)) OR (f2.\"to\" = $3 AND (f2.accepted = 1 OR f2.accepted = 0))) ORDER BY lastOnlineDate DESC LIMIT $4 OFFSET $5";
const queryGetFriendStatus:string = "SELECT accepted FROM \"friend\" WHERE (\"from\" = $1 AND \"to\" = $2) OR (\"from\" = $3 AND \"to\" = $4) ORDER BY creationDate DESC LIMIT 1";
const queryGetActiveFriendRequestList:string = "SELECT u.id, u.username, u.creationDate, u.profilePicture FROM \"friend\" f INNER JOIN \"user\" u ON f.\"from\" = u.id WHERE f.accepted = 0 AND f.\"to\" = $1 ORDER BY f.creationDate DESC LIMIT $2 OFFSET $3";
const queryGetPendingFriendRequestList:string = "SELECT u.id, u.username, u.creationDate, u.profilePicture FROM \"friend\" f INNER JOIN \"user\" u ON f.\"to\" = u.id WHERE f.accepted = 0 AND f.\"from\" = $1 ORDER BY f.creationDate DESC LIMIT $2 OFFSET $3";

const queryCreateFriendRequest:string = "INSERT INTO \"friend\"(\"from\", \"to\", accepted, creationDate) VALUES ($1, $2, 0, NOW())";
const queryCancelFriendRequest:string = "UPDATE \"friend\" SET accepted = 2 WHERE accepted = 0 AND \"from\" = $1 AND \"to\" = $2";
const queryAcceptFriendRequest:string = "UPDATE \"friend\" SET accepted = 1 WHERE accepted = 0 AND \"from\" = $1 AND \"to\" = $2";

export async function configureDatabase(config:pg.ClientConfig) {
    connection = new pg.Client(config);
    connection.on('error', (err) => {
        console.log('something bad has happened!', err.stack)
    })
    await connection.connect()
}

export async function registerUser(username:string, password:string) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return false;
    }

    try {
        let user = await getUserByUsername(username);
        if (user) return false;
        let result = await connection.query(queryAddUser, [username, password]);
        return result.rowCount === 1;
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
        console.log("one")

        let result = await connection.query<User>(querySelectUserAndPass, [username, password]);
        console.log("Here")
        return result.rows;
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
        let result = await connection.query<User>(querySelectUserAndRelogin, [username, code]);
        return result.rows;
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
        let result = await connection.query<User>(querySelectUser, [username]);
        if (result.rows.length !== 1)
            return null;
        return result.rows[0] as User;
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
        let result = await connection.query(queryUpdateReloginCode, [code, id1?.id]);
        return result.rowCount === 1;
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
        let result = await connection.query(queryUpdateLastOnline, [id1?.id]);
        return result.rowCount === 1;

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
        let result = await connection.query(queryAddMessage, [fromID?.id, toID?.id, message]);
        return result.rowCount === 1;
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
        let result = await connection.query<Message>(queryGetMessageInPages, [id1?.id, id2?.id, id2?.id, id1?.id, 50, 50 * (page - 1)]);
        return result.rows;
    }
    catch (e) {
        console.error(e);
        return null;
    }
}

export async function getMessageLatest(username:string, page:number) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return null;
    }
    try {
        let id1 = await getUserByUsername(username);
        let result = await connection.query(queryGetMessageLatest, [id1?.id, id1?.id, id1?.id, id1?.id, 20, 20 * (page - 1)]);
        return result.rows;
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
        let result = await connection.query<User>(queryGetFriendList, [id1?.id, id1?.id, 20, 20 * (page - 1)]);
        return result.rows;
    }
    catch (e) {
        console.error(e);
        return null;
    }
}

export async function getNotFriendList(username:string, page:number) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return null;
    }

    try {
        let id1 = await getUserByUsername(username);
        let result = await connection.query<User>(queryGetNotFriendSelect, [id1?.id, id1?.id, id1?.id, 10, 10 * (page - 1)]);
        return result.rows;
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
        let result = await connection.query(queryGetFriendStatus, [id1?.id, id2?.id, id2?.id, id1?.id]);
        if (result.rows.length !== 1)
            return -1;
        return result.rows[0].accepted as number;
    }
    catch (e) {
        console.error(e);
        return -1;
    }
}

export async function getActiveFriendRequest(username:string, page:number) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return null;
    }

    try {
        let id = await getUserByUsername(username);
        let result = await connection.query(queryGetActiveFriendRequestList, [id?.id, 10, 10 * (page - 1)]);
        return result.rows;
    }
    catch (e) {
        console.error(e);
        return null;
    }
}

export async function getPendingFriendRequest(username:string, page:number) {
    if (!connection) {
        console.error("ERROR: There's no connection established");
        return null;
    }

    try {
        let id = await getUserByUsername(username);
        let result = await connection.query(queryGetPendingFriendRequestList, [id?.id, 10, 10 * (page - 1)]);
        return result.rows;
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
        let result = await connection.query(queryCreateFriendRequest, [fromID?.id, toID?.id]);
        return result.rowCount === 1;
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
        let result = await connection.query(queryAcceptFriendRequest, [fromID?.id, toID?.id]);
        return result.rowCount === 1;
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
        let result = await connection.query(queryCancelFriendRequest, [fromID?.id, toID?.id]);
        return result.rowCount === 1;
    }
    catch (e) {
        console.error(e);
        return false;
    }
}