import { io } from 'socket.io-client';

const host = import.meta.env.VITE_HOST;
const port = import.meta.env.VITE_BACKEND_PORT;
const socket = io(`http://${host}:${port}`);

console.log(host, port);


socket.on('connect', () => {
  console.log(socket.id);
});
