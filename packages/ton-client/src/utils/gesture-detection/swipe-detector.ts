import SingleTouchDetector from './single-touch-detector';

class SwipeDetector extends SingleTouchDetector {
  static TYPE = 'swipe';

  constructor(touchEvents: TouchEvent[]) {
    super(touchEvents, SwipeDetector.TYPE);
  }

  detect(): boolean {
    if (this.currentTouchesLength !== SwipeDetector.NUM_TOUCHES) return false;
    if (!this.fulfillsSwipeRequirements) return false;

    return true;
  }

  get fulfillsSwipeRequirements(): boolean {
    const fulfillsTimeThreashold =
      this._timeBetweenFirstRelevantAndLastTouch <
      SwipeDetector.PAN_SWIPE_THREASHOLD_MS;
    const fulfillsMoveThreashold =
      this._distBetweenFirstRelevantAndLastTouch >
      SwipeDetector.PAN_SWIPE_THREASHOLD_PX;

    return fulfillsTimeThreashold && fulfillsMoveThreashold;
  }

  get distX(): number {
    if (!this.firstRelevantTouchEvent) return 0;

    const firstTouchX = this.firstRelevantTouchEvent.touches[0].clientX;
    const lastTouchX = this.lastTouchEvent.touches[0].clientX;

    return lastTouchX - firstTouchX;
  }

  get distY(): number {
    if (!this.firstRelevantTouchEvent) return 0;

    const firstTouchY = this.firstRelevantTouchEvent.touches[0].clientY;
    const lastTouchY = this.lastTouchEvent.touches[0].clientY;

    return lastTouchY - firstTouchY;
  }

  get isHorizontal(): boolean {
    return Math.abs(this.distX) < Math.abs(this.distY);
  }

  get callbackValue(): string {
    if (this.isHorizontal) {
      return this.distY >= 0 ? 'down' : 'up';
    } else {
      return this.distX >= 0 ? 'right' : 'left';
    }
  }
}

export default SwipeDetector;
