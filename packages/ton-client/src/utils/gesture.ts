import { vec2 } from 'gl-matrix';

// TODO: swipe gesture is a pan gesture (add pan and differentiate between the two)
// TODO: add rotate gesture

export const GESTURE_TYPES = {
  tap: 'tap',
  swipe: 'swipe',
  pinch: 'pinch',
  none: 'none',
};

class GestureDetector {
  type: string;

  start: TouchEvent;
  prevs: TouchEvent[] = [];
  current?: TouchEvent;
  end?: TouchEvent;

  constructor(start: TouchEvent, type: string) {
    this.start = start;
    this.type = type;
  }

  update(current: TouchEvent) {
    this.prevs.push(current);
    this.current = current;
  }

  handleTouchEnd(end: TouchEvent) {
    this.update(end);
    this.end = end;
  }

  protected _distBetween2Touches(touch1: Touch, touch2: Touch): number {
    const position1 = vec2.fromValues(touch1.clientX, touch1.clientY);
    const position2 = vec2.fromValues(touch2.clientX, touch2.clientY);

    return vec2.distance(position1, position2);
  }
}

export default GestureDetector;
