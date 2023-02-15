import TwoTouchesDetector from './two-touches-detector';

class BendDetector extends TwoTouchesDetector {
  static TYPE = 'bend';

  constructor() {
    super(BendDetector.TYPE);
  }

  detect(touchEvents: TouchEvent[], numTouches: number): boolean {
    super.detect(touchEvents, numTouches);

    return false;
  }

  get callbackValue(): number {
    return 0;
  }
}

export default BendDetector;
