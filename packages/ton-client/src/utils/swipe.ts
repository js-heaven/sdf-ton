import GestureDetector, { GESTURE_TYPES } from './gesture';

const MIN_PX_MOVE_TOLERANCE = 10;
const MAX_TOUCHES = 1;

class SwipeDetector extends GestureDetector {
  private _isSwipeEvent: boolean;

  constructor(start: TouchEvent) {
    super(start, GESTURE_TYPES.swipe);
    this._isSwipeEvent = false;
  }

  get isSwipeEvent(): boolean {
    if (!this.current) return false;
    if (this._isSwipeEvent) return true;

    const startTouchesLength = this.start.changedTouches.length;
    const currentTouchesLength = this.current.changedTouches.length;

    if (
      startTouchesLength != MAX_TOUCHES ||
      currentTouchesLength != MAX_TOUCHES
    )
      return false;

    if (this.distToStart < MIN_PX_MOVE_TOLERANCE) return false;

    this._isSwipeEvent = true;
    return true;
  }

  get distToStart(): number {
    if (!this.current) return 0;

    const startTouch = this.start.changedTouches[0];
    const currentTouch = this.current.changedTouches[0];

    return this._distBetween2Touches(startTouch, currentTouch);
  }
}

export default SwipeDetector;
