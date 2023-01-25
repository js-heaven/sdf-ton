import express, { Express, Request, Response } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

dotenv.config();

const app: Express = express();
const host = process.env.VITE_HOST;
const port = process.env.VITE_BACKEND_PORT;
const frontendPort = process.env.FRONTEND_PORT;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: `http://${host}:${frontendPort}`,
    methods: ['GET', 'POST']
  }
});

app.get('/', (req: Request, res: Response) => {
  res.send('Hello 👋');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  console.log(socket.id);
});

server.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
