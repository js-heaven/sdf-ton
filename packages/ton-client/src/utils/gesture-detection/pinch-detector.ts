import TwoTouchesDetector from './two-touches-detector';

class PinchDetector extends TwoTouchesDetector {
  static TYPE = 'pinch';

  constructor() {
    super(PinchDetector.TYPE);
  }

  detect(touchEvents: TouchEvent[], numTouches: number): boolean {
    super.detect(touchEvents, numTouches);

    if (this.currentTouchesLength !== PinchDetector.NUM_TOUCHES) return false;

    if (
      Math.abs(this.distRelativeToStart) < PinchDetector.PX_MOVE_TOLERANCE
    ) {
      return false;
    }

    return true;
  }

  get distRelativeToStart(): number {
    if (this.touchEventsLength < PinchDetector.NUM_EVENTS_THREASHOLD) return 0;
    if (!this.firstRelevantTouchEvent) return 0;

    const distStart = this._distBetweenTouches(this.firstRelevantTouchEvent);
    const distCurrent = this._distBetweenTouches(this.currentTouchEvent);

    return distCurrent - distStart;
  }

  get callbackValue(): number {
    return this.distRelativeToStart;
  }
}

export default PinchDetector;
