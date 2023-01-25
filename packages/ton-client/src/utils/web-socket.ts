import { io } from 'socket.io-client';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const socket = io(backendUrl);

socket.on('connect', () => {
  console.log(socket.id);
});
