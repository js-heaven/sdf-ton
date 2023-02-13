import SingleTouchDetector from './single-touch-detector';

// A tap is recognized when the pointer is doing a small tap/click.
class TapDetector extends SingleTouchDetector {
  static TYPE = 'tap';
  static MAX_DELAY_MS = 2000;

  constructor() {
    super(TapDetector.TYPE);
  }

  detect(touchEvents: TouchEvent[], numTouches: number): boolean {
    super.detect(touchEvents, numTouches);

    if (this._timeBetweenFirstRelevantAndLastTouch > TapDetector.MAX_DELAY_MS) return false;

    const startTouch = this.firstTouchEvent.changedTouches[0];
    const endTouch = this.lastTouchEvent.changedTouches[0];
    const pxMoved = this._distBetween2Touches(startTouch, endTouch);

    return pxMoved <= TapDetector.PX_MOVE_TOLERANCE;
  }
}

export default TapDetector;
