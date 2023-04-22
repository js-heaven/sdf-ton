import { Socket } from 'socket.io-client';
import config from './config';

class Store {
  private timeOffset = 0; 

  constructor(
    socket: Socket,
  ) {
    const startTime = performance.now(); 
    socket.on('syncPong', (timeOffset) => {
      const endTime = performance.now();
      const serverTime = (endTime - startTime) / 2 + timeOffset; 
      this.timeOffset = serverTime - performance.now();
    }) 
    socket.emit('syncPing');
  }

  getCurrentTime() {
    return (performance.now() + this.timeOffset) * 0.001
  }

  getCurrentSlot() {
    return (performance.now() + this.timeOffset) * 0.001 % config.barDuration / config.barDuration;
  }

  nextBarIn() {
    const currentTime = this.getCurrentTime()
    return config.barDuration - (currentTime % config.barDuration) 
  }
}

export default Store;
