export const TAP_STATES = [0.75, 1];
export const SWIPE_STATES = [0, 1];
export const PINCH_STATES = [0, 1];

class Store {
  tapState = TAP_STATES[0];
  swipeState = SWIPE_STATES[0];
  pinchState = PINCH_STATES[0];

  toggleTapState() {
    this.tapState = TAP_STATES.indexOf(this.tapState) ? TAP_STATES[0] : TAP_STATES[1];
  }
}

export default Store;
