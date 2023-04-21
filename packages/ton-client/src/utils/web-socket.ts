import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default () => {
  const socket = io(BACKEND_URL);

  socket.on('connect', () => {
    console.log('connected', socket.id);
  });

  return socket;
};
