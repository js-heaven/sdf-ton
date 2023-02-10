import { Socket } from 'socket.io-client';

type Dimensions = {
  height: number;
  width: number;
};

export const TAP_STATES = [0.75, 1];
export const PAN_STATES = [0, 1];
export const SWIPE_STATES = [0, 1];
export const PINCH_STATES = [0, 1];

class Store {
  dimensions: Dimensions = { width: 1, height: 1 };

  tapState = TAP_STATES[0];
  panState = PAN_STATES[0];
  swipeState = SWIPE_STATES[0];
  pinchState = PINCH_STATES[0];
  twist = 0;

  socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;

    this._registerSocketListeners();
  }

  toggleTapState() {
    this.tapState = TAP_STATES.indexOf(this.tapState)
      ? TAP_STATES[0]
      : TAP_STATES[1];

    this._pushState();
  }

  updatePanState(newPanState: { deltaX: number; deltaY: number }) {
    let newTwist = this.twist + (2 * newPanState.deltaY) / this.dimensions.height;
    newTwist = Math.min(newTwist, 1);
    newTwist = Math.max(newTwist, -1);
    console.log('twist', newTwist);

    this.twist = newTwist;


    this._pushState();
  }

  private _registerSocketListeners() {
    this.socket.on('updateState', (newState) => {
      console.log('updateState', newState);
      this.tapState = newState.tapState;
      this.twist = newState.twistState;
    });
  }

  private _pushState() {
    this.socket.emit('pushState', {
      tapState: this.tapState,
      panState: this.panState,
      swipeState: this.swipeState,
      pinchState: this.pinchState,
      twistState: this.twist
    });
  }
}

export default Store;
