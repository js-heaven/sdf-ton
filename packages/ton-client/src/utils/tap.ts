import { vec2 } from "gl-matrix";

const MAX_DELAY_MS = 2000;
const MAX_PX_MOVE_TOLERANCE = 10;
const MAX_TOUCHES = 1;

class TapDetector {
  start: TouchEvent;
  end?: TouchEvent;

  constructor(start: TouchEvent) {
    this.start = start;
  }

  update(end: TouchEvent) {
    this.end = end;
  }

  get isTapEvent(): boolean {
    if (!this.end) return false;

    const startTouchesLength = this.start.changedTouches.length;
    const endTouchesLength = this.end.changedTouches.length;

    if (startTouchesLength != MAX_TOUCHES || endTouchesLength != MAX_TOUCHES) return false;

    const startTimeStamp = this.start.timeStamp;
    const endTimeStamp = this.end.timeStamp;

    if (endTimeStamp - startTimeStamp > MAX_DELAY_MS) return false;

    const startTouch = this.start.changedTouches[0];
    const endTouch = this.end.changedTouches[0];
    const startPosition = vec2.fromValues(startTouch.clientX, startTouch.clientY);
    const endPosition = vec2.fromValues(endTouch.clientX, endTouch.clientY);
    const pxMoved = vec2.distance(startPosition, endPosition);

    return pxMoved <= MAX_PX_MOVE_TOLERANCE;
  }
}

export default TapDetector;
