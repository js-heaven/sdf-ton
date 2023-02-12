import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import https from 'https';
import fs from "fs";

import { Server } from 'socket.io';

const key = fs.readFileSync("ca.key", "utf-8");
const cert = fs.readFileSync("ca.crt", "utf-8");


const app: Express = express();
const frontendUrl = process.env.FRONTEND_URL;
const port = process.env.BACKEND_PORT;

const server = https.createServer({ key, cert }, app);
const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ['GET', 'POST'],
  },
});

const store = {
  tapState: 0.75,
  panState: 0,
  swipeState: 0,
  pinchState: 0,
  twistState: 0,
}

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello 👋');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  console.log(socket.id);

  socket.emit('updateState', store);

  socket.on('pushState', (state: any) => {
    store.tapState = state.tapState;
    store.twistState = state.twistState;
    socket.broadcast.emit('updateState', store);
  });
});

server.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
