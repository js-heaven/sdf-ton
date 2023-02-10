import BaseGestureDetector from './gesture';
import PanDetector from './pan';
import PinchDetector from './pinch';
import SwipeDetector from './swipe';
import TapDetector from './tap';

export type GestureCallbackFn = (gestureType: string, otherArgs?: any) => void;

class GestureDetector {
  touchEvents: TouchEvent[] = [];
  callbackFn: GestureCallbackFn;
  detectedGesture = '';
  numTouches = 1;

  tapDetector: TapDetector;
  panDetector: PanDetector;
  swipeDetector: SwipeDetector;
  pinchDetector: PinchDetector;

  constructor(startTouchEvent: TouchEvent, callbackFn: GestureCallbackFn) {
    this.callbackFn = callbackFn;
    this.update(startTouchEvent);

    this.tapDetector = new TapDetector(this.touchEvents);
    this.panDetector = new PanDetector(this.touchEvents);
    this.swipeDetector = new SwipeDetector(this.touchEvents);
    this.pinchDetector = new PinchDetector(this.touchEvents);
  }

  update(touchEvent: TouchEvent) {
    this.touchEvents.push(touchEvent);
  }

  handleTouchMove(touchEvent: TouchEvent) {
    this.update(touchEvent);

    this.detectGesture(this.panDetector);
    this.detectGesture(this.pinchDetector);
  }

  handleTouchEnd() {
    this.detectGesture(this.tapDetector);
    this.detectGesture(this.swipeDetector);
  }

  addTouch(touchEvent: TouchEvent) {
    this.numTouches += 1;
    this.update(touchEvent);
  }

  private detectGesture(detector: BaseGestureDetector) {
    if (this.numTouches !== detector.numDesiredTouches) return;
    if (this.detectedGesture && this.detectedGesture !== detector.type) return;

    const gestureDetected = detector.detect();
    if (!gestureDetected) return;

    this.detectedGesture = this.detectedGesture ? this.detectedGesture : detector.type;
    this.callbackFn(this.detectedGesture, detector.callbackValue);
  }
}

export default GestureDetector;
