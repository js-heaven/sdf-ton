import TwoTouchesDetector from './two-touches';

class PinchDetector extends TwoTouchesDetector {
  static TYPE = 'pinch';

  constructor(touchEvents: TouchEvent[]) {
    super(touchEvents, PinchDetector.TYPE);
  }

  detect(): boolean {
    if (this.currentTouchesLength !== PinchDetector.NUM_TOUCHES) return false;

    if (
      Math.abs(this.distRelativeToStart) < TwoTouchesDetector.PX_MOVE_TOLERANCE
    ) {
      return false;
    }

    return true;
  }

  get distRelativeToStart(): number {
    if (this.touchEventsLength < TwoTouchesDetector.NUM_EVENTS_THREASHOLD) return 0;
    if (!this.firstRelevantTouchEvent) return 0;

    const startTouch0 = this.firstRelevantTouchEvent.touches[0];
    const startTouch1 = this.firstRelevantTouchEvent.touches[1];
    const currentTouch0 = this.currentTouchEvent.touches[0];
    const currentTouch1 = this.currentTouchEvent.touches[1];

    const distStart = this._distBetween2Touches(startTouch0, startTouch1);
    const distCurrent = this._distBetween2Touches(currentTouch0, currentTouch1);

    return distCurrent - distStart;
  }

  get callbackValue(): number {
    return this.distRelativeToStart;
  }
}

export default PinchDetector;
