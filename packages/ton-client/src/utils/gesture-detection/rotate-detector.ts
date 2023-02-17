import { vec2 } from 'gl-matrix';
import TwoTouchesDetector from './two-touches-detector';

class RotateDetector extends TwoTouchesDetector {
  static TYPE = 'rotate';
  static DISTANCE_THREASHOLD_PX = 50;
  static ANGLE_THREASHOLD_DEG = 10;

  constructor() {
    super(RotateDetector.TYPE);
  }

  detect(touchEvents: TouchEvent[], numTouches: number): boolean {
    super.detect(touchEvents, numTouches);

    if (this.currentTouchesLength !== RotateDetector.NUM_TOUCHES) return false;

    const previousDistance = this._distBetweenTouches(this.previousTouchEvent);
    const currentDistance = this._distBetweenTouches(this.currentTouchEvent);

    if (
      Math.abs(previousDistance - currentDistance) > RotateDetector.DISTANCE_THREASHOLD_PX
    ) return false;


    if (this.angle < RotateDetector.ANGLE_THREASHOLD_DEG) return false;

    return true;
  }

  get angle(): number {
    const previousVec = this._vecBetweenTouches(this.previousTouchEvent);
    const currentVec = this._vecBetweenTouches(this.currentTouchEvent);

    return vec2.angle(previousVec, currentVec);
  }

  get callbackValue(): number {
    return this.angle;
  }
}

export default RotateDetector;
