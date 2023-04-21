import { Socket } from 'socket.io-client';
import config from './config';

class Store {
  private timeOffset = 0; 

  constructor(
    socket: Socket,
  ) {
    const startTime = Date.now(); 
    socket.on('syncPong', (timeOffset) => {
      const endTime = Date.now();
      const serverTime = (endTime - startTime) / 2 + timeOffset; 
      this.timeOffset = serverTime - Date.now();
    }) 
    socket.emit('syncPing');
  }

  getCurrentTime() {
    return (Date.now() + this.timeOffset) * 0.001
  }

  getCurrentSlot() {
    return (Date.now() + this.timeOffset) * 0.001 % config.barDuration / config.barDuration;
  }

  getNextBarStart() {
    const currentTime = this.getCurrentTime()
    return (Math.floor(currentTime / config.barDuration) + 1) * config.barDuration
  }
}

export default Store;
