import BaseGestureDetector from './gesture';

class PanSwipeDetector extends BaseGestureDetector {
  static NUM_TOUCHES = 1;
  static PAN_SWIPE_THREASHOLD_MS = 200;
  static PAN_SWIPE_THREASHOLD_PX = 50;

  constructor(touchEvents: TouchEvent[], type: string) {
    super(touchEvents, type, PanSwipeDetector.NUM_TOUCHES);
  }

  protected get _distBetweenFirstRelevantAndLastTouch(): number {
    if (!this.firstRelevantTouchEvent) return 0;

    const firstTouch = this.firstRelevantTouchEvent.touches[0];
    const lastTouch = this.lastTouchEvent.touches[0];

    return this._distBetween2Touches(firstTouch, lastTouch);
  }
}

export default PanSwipeDetector;
