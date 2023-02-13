import { vec2 } from 'gl-matrix';
import BaseGestureDetector from './base-gesture-detector';

class TwoTouchesDetector extends BaseGestureDetector {
  static NUM_TOUCHES = 2;

  constructor(type: string) {
    super(type, TwoTouchesDetector.NUM_TOUCHES);
  }

  protected _distBetweenTouches(touchEvent?: TouchEvent): number {
    if (!touchEvent) return 0;
    if (touchEvent.touches.length !== TwoTouchesDetector.NUM_TOUCHES) return 0;

    const touch1 = touchEvent.touches[0];
    const touch2 = touchEvent.touches[1];

    return this._distBetween2Touches(touch1, touch2);
  }

  protected _vecBetweenTouches(touchEvent?: TouchEvent): vec2 {
    if (!touchEvent) return vec2.fromValues(0, 0);
    if (touchEvent.touches.length !== TwoTouchesDetector.NUM_TOUCHES) return vec2.fromValues(0, 0);

    const touch1 = touchEvent.touches[0];
    const touch2 = touchEvent.touches[1];

    return this._vecBetween2Touches(touch1, touch2);
  }
}

export default TwoTouchesDetector;
