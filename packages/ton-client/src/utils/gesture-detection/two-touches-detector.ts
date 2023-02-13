import BaseGestureDetector from './base-gesture-detector';

class TwoTouchesDetector extends BaseGestureDetector {
  static NUM_TOUCHES = 2;

  constructor(touchEvents: TouchEvent[], type: string) {
    super(touchEvents, type, TwoTouchesDetector.NUM_TOUCHES);
  }
}

export default TwoTouchesDetector;
