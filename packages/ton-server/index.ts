import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import https from 'https';
import fs from 'fs';

import { Server } from 'socket.io';
import Store, { State } from './store';

const key = fs.readFileSync('ca.key', 'utf-8');
const cert = fs.readFileSync('ca.crt', 'utf-8');

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

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello 👋');
});

const store = new Store;

io.on('connection', (socket) => {
  console.log('a user connected');
  console.log(socket.id);

  socket.emit('updateState', store.state);

  socket.on('pushState', (newState: State) => {
    store.updateState(newState);
    socket.broadcast.emit('updateState', store.state);
  });
});

server.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
