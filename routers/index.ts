import express, { Application, Request, Response, NextFunction } from 'express';
import { json } from 'body-parser';
import { resolve } from 'path';
import api from './api';
import chat from "./chat";

export default function configure(app: Application) {
    app
        .use(express.static('public'))
        .use(json())
        .use('/api', api())
        .use('/chat', chat())
        .use('/error', (req, res, next) => {
            next(new Error('Other Error'));
        })
        .use((req, res, next) => {
            next(new Error('Not Found'));
        })
        .use((error: Error, req: Request, res: Response, next: NextFunction) => {
            switch (error.message) {
                case 'Not Found':
                    res.sendFile(resolve(__dirname, '../public/notfound.html'));
                    return;
            }

            res.sendFile(resolve(__dirname, '../public/error.html'));
        });
}