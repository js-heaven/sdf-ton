import SingleTouchDetector from './single-touch-detector';

class PanDetector extends SingleTouchDetector {
  static TYPE = 'pan';

  constructor(touchEvents: TouchEvent[]) {
    super(touchEvents, PanDetector.TYPE);
  }

  detect(): boolean {
    if (this.currentTouchesLength !== PanDetector.NUM_TOUCHES) return false;
    if (
      this._distBetweenFirstRelevantAndLastTouch <
      PanDetector.PX_MOVE_TOLERANCE
    )
      return false;
    if (!this.fulfillsPanRequirements) return false;

    return true;
  }

  get fulfillsPanRequirements(): boolean {
    const fulfillsTimeThreashold =
      this._timeBetweenFirstRelevantAndLastTouch >
      PanDetector.PAN_SWIPE_THREASHOLD_MS;

    return fulfillsTimeThreashold;
  }

  get callbackValue(): { deltaX: number; deltaY: number } {
    const previousTouch = this.touchEvents[this.touchEvents.length - 2];

    if (!this.firstRelevantTouchEvent || !previousTouch) return { deltaX: 0, deltaY: 0 };



    const deltaX =
      this.lastTouchEvent.touches[0].clientX -
      previousTouch.touches[0].clientX;
    const deltaY =
      previousTouch.touches[0].clientY - this.lastTouchEvent.touches[0].clientY;
    return {
      deltaX,
      deltaY,
    };
  }
}

export default PanDetector;
