import GestureDetector, { GESTURE_TYPES } from './gesture';

const MAX_DELAY_MS = 2000;
const MAX_PX_MOVE_TOLERANCE = 10;
const MAX_TOUCHES = 1;

// A tap is recognized when the pointer is doing a small tap/click.
class TapDetector extends GestureDetector {
  constructor(start: TouchEvent) {
    super(start, GESTURE_TYPES.tap);
  }

  get isTapEvent(): boolean {
    if (!this.end) return false;

    const startTouchesLength = this.start.changedTouches.length;
    const endTouchesLength = this.end.changedTouches.length;

    if (startTouchesLength != MAX_TOUCHES || endTouchesLength != MAX_TOUCHES)
      return false;

    const startTimeStamp = this.start.timeStamp;
    const endTimeStamp = this.end.timeStamp;

    if (endTimeStamp - startTimeStamp > MAX_DELAY_MS) return false;

    const startTouch = this.start.changedTouches[0];
    const endTouch = this.end.changedTouches[0];
    const pxMoved = this._distBetween2Touches(startTouch, endTouch);

    return pxMoved <= MAX_PX_MOVE_TOLERANCE;
  }
}

export default TapDetector;
