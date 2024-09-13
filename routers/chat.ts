import {Router} from "express";
import {resolve} from "path";

export default function chat() {
    const router = Router();
    router
        .use((req, res, next) => {
            if (!req.body) {
                next(new Error('Bad request'));
                return;
            }
            next();
        })
        .get('/', (req, res, next) => {
            res.sendFile(resolve(__dirname, '../public/index.html'));
        })
        .use((req, res, next) => {
            res.json({
                error: 'Invalid route',
            })
        })
    return router;
}