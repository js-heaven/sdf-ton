import { vec3 } from 'gl-matrix';

export type TapState = 0 | 1;
export type SwipeState = 0 | 1;
export type PinchState = 0 | 1;

export const TAP_STATES: TapState[] = [0, 1];
export const SWIPE_STATES: SwipeState[] = [0, 1];
export const PINCH_STATES: PinchState[] = [0, 1];

class Store {
  tapState: TapState = TAP_STATES[0];
  swipeState: SwipeState = SWIPE_STATES[0];
  pinchState: PinchState = PINCH_STATES[0];

  state: vec3 = vec3.fromValues(
    this.tapState,
    this.swipeState,
    this.pinchState
  );

  toggleTapState() {
    this.tapState = this.tapState ? 0 : 1;
    this.updateState();
  }

  updateState() {
    vec3.set(this.state, this.tapState, this.swipeState, this.pinchState);
  }
}

export default Store;
