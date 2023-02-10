import BaseGestureDetector from './gesture';

// A tap is recognized when the pointer is doing a small tap/click.
class TapDetector extends BaseGestureDetector {
  static TYPE = 'tap';
  static NUM_TOUCHES = 1;
  static MAX_DELAY_MS = 2000;

  constructor(touchEvents: TouchEvent[]) {
    super(touchEvents, TapDetector.TYPE, TapDetector.NUM_TOUCHES);
  }

  detect(): boolean {
    if (this._timeBetweenFirstRelevantAndLastTouch > TapDetector.MAX_DELAY_MS) return false;

    const startTouch = this.firstTouchEvent.changedTouches[0];
    const endTouch = this.lastTouchEvent.changedTouches[0];
    const pxMoved = this._distBetween2Touches(startTouch, endTouch);

    return pxMoved <= BaseGestureDetector.PX_MOVE_TOLERANCE;
  }
}

export default TapDetector;
