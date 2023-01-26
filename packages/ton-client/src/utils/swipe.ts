import { vec2 } from 'gl-matrix';

const MIN_PX_MOVE_TOLERANCE = 10;
const MAX_TOUCHES = 1;

class SwipeDetector {
  private _isSwipeEvent: boolean;

  start: TouchEvent;
  prevs: TouchEvent[] = [];
  current?: TouchEvent;

  constructor(start: TouchEvent) {
    this.prevs.push(start);
    this.start = start;
    this._isSwipeEvent = false;
  }

  update(current: TouchEvent) {
    this.prevs.push(current);
    this.current = current;
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

    const startTouch = this.start.changedTouches[0];
    const currentTouch = this.current.changedTouches[0];
    const pxMoved = this._distanceFromTouch(startTouch, currentTouch);

    if (pxMoved < MIN_PX_MOVE_TOLERANCE) return false;

    this._isSwipeEvent = true;
    return true;
  }

  get distanceToPrev(): number {
    if (!this.current) return 0;

    const prevTouch = this.prevs[this.prevs.length - 2].changedTouches[0];
    const currentTouch = this.current.changedTouches[0];

    return this._distanceFromTouch(prevTouch, currentTouch);
  }

  get distanceToStart(): number {
    if (!this.current) return 0;

    const startTouch = this.start.changedTouches[0];
    const currentTouch = this.current.changedTouches[0];

    return this._distanceFromTouch(startTouch, currentTouch);
  }

  private _distanceFromTouch(touch1: Touch, touch2: Touch): number {
    const position1 = vec2.fromValues(touch1.clientX, touch1.clientY);
    const position2 = vec2.fromValues(touch2.clientX, touch2.clientY);

    return vec2.distance(position1, position2);
  }
}

export default SwipeDetector;
