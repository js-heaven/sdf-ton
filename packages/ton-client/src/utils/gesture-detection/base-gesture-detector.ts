import { vec2 } from 'gl-matrix';

export const GESTURE_TYPES = {
  tap: 'tap', // modify the objects (e.g.: add some bumps)
  pan: 'pan', // not sure yet
  swipe: 'swipe', // horizontal: change bpm or switch filter | vertical: change randomness?
  pinch: 'pinch', // zoom-in: stretch the object | zoom-out: squeeze the object
  rotate: 'rotate', // twist the object
  bend: 'bend', // hold down one finger and pan into a direction with the other one -> bend the object
  none: 'none',
};

class BaseGestureDetector {
  static PX_MOVE_TOLERANCE = 10;
  static NUM_EVENTS_THREASHOLD = 5;

  type: string;
  numDesiredTouches: number;

  touchEvents: TouchEvent[] = [];
  numTouches = 0;

  constructor(type: string, numDesiredTouches: number) {
    this.type = type;
    this.numDesiredTouches = numDesiredTouches;
  }

  detect(touchEvents: TouchEvent[], numTouches: number) {
    this.touchEvents = touchEvents;
    this.numTouches = numTouches;
    return false; // will be implemented by children
  }

  get touchEventsLength() {
    return this.touchEvents.length;
  }

  get firstTouchEvent(): TouchEvent {
    return this.touchEvents[0];
  }

  get currentTouchEvent(): TouchEvent {
    return this.touchEvents[this.touchEvents.length - 1];
  }

  get lastTouchEvent(): TouchEvent {
    return this.currentTouchEvent;
  }

  get firstRelevantTouchEvent(): TouchEvent | undefined {
    return this.touchEvents.find(({ touches }) => {
      return touches.length === this.numDesiredTouches;
    });
  }

  get previousTouchEvent(): TouchEvent | undefined {
    return this.touchEvents[this.touchEventsLength - 2];
  }

  get currentTouchesLength(): number {
    return this.currentTouchEvent.touches.length;
  }

  get callbackValue(): any {
    return 0; // will be implemented by children
  }

  protected get _timeBetweenFirstRelevantAndLastTouch(): number {
    if (!this.firstRelevantTouchEvent) return 0;

    const startTimeStamp = this.firstRelevantTouchEvent.timeStamp;
    const endTimeStamp = this.lastTouchEvent.timeStamp;

    return endTimeStamp - startTimeStamp;
  }

  protected _distBetween2Touches(touch1: Touch, touch2: Touch): number {
    const position1 = vec2.fromValues(touch1.clientX, touch1.clientY);
    const position2 = vec2.fromValues(touch2.clientX, touch2.clientY);

    return vec2.distance(position1, position2);
  }

  protected _vecBetween2Touches(touch1: Touch, touch2: Touch): vec2 {
    const position1 = vec2.fromValues(touch1.clientX, touch1.clientY);
    const position2 = vec2.fromValues(touch2.clientX, touch2.clientY);
    const outVec = vec2.fromValues(0, 0);

    vec2.sub(outVec, position2, position1);

    return outVec;
  }
}

export default BaseGestureDetector;
