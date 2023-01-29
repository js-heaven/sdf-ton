import GestureDetector, { GESTURE_TYPES } from './gesture';

const MIN_PX_MOVE_TOLERANCE = 10;
const NUM_TOUCHES = 2;

// TODO: needs fintuning -> sometimes not detected when first touch is not with two fingers
// Recognized when two or more pointers are moving toward (zoom-in) or away from each other (zoom-out).
class PinchDetector extends GestureDetector {
  private _isPinchEvent: boolean;

  constructor(start: TouchEvent) {
    super(start, GESTURE_TYPES.pinch);
    this._isPinchEvent = false;
  }

  get isPinchEvent(): boolean {
    if (!this.current) return false;
    if (this._isPinchEvent) return true;

    const startTouchesLength = this.start.changedTouches.length;
    const currentTouchesLength = this.current.changedTouches.length;

    if (
      startTouchesLength != NUM_TOUCHES ||
      currentTouchesLength != NUM_TOUCHES
    )
      return false;

    if (Math.abs(this.distRelativeToStart) < MIN_PX_MOVE_TOLERANCE)
      return false;

    this._isPinchEvent = true;

    return true;
  }

  get distRelativeToStart(): number {
    if (!this.current) return 0;

    const startTouch0 = this.start.changedTouches[0];
    const startTouch1 = this.start.changedTouches[1];
    const currentTouch0 = this.current.changedTouches[0];
    const currentTouch1 = this.current.changedTouches[1];

    const distStart = this._distBetween2Touches(startTouch0, startTouch1);
    const distCurrent = this._distBetween2Touches(currentTouch0, currentTouch1);

    return distCurrent - distStart;
  }
}

export default PinchDetector;
