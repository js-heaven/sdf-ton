import BaseGestureDetector from './base-gesture-detector';
import PanDetector from './pan-detector';
import PinchDetector from './pinch-detector';
// Rotation is sitll WIP
// import RotateDetector from './rotate-detector';
import SwipeDetector from './swipe-detector';
import TapDetector from './tap-detector';

export type GestureCallbackFn = (gestureType: string, otherArgs?: any) => void;

class GestureHandler {
  touchTarget: HTMLElement;
  callbackFn: GestureCallbackFn;

  touchEvents: TouchEvent[] = [];
  detectedGesture = '';
  numTouches = 0;

  tapDetector = new TapDetector;
  panDetector = new PanDetector;
  swipeDetector = new SwipeDetector;
  pinchDetector = new PinchDetector;
  // rotateDetector = new RotateDetector;

  constructor(touchTarget: HTMLElement, callbackFn: GestureCallbackFn) {
    this.callbackFn = callbackFn;
    this.touchTarget = touchTarget || document;

    this.addEventListeners();
  }

  addEventListeners() {
    this.touchTarget.addEventListener(
      'touchstart',
      this.handleTouchStart.bind(this), 
      { passive: false }
    );

    this.touchTarget.addEventListener(
      'touchmove',
      this.handleTouchMove.bind(this), 
      { passive: false }
    );
    this.touchTarget.addEventListener(
      'touchcancel',
      this.handleTouchCancel.bind(this), 
      { passive: false }
    );
    this.touchTarget.addEventListener(
      'touchend',
      this.handleTouchEnd.bind(this), 
      { passive: false }
    );
  }

  handleTouchStart(ev: TouchEvent) {
    ev.preventDefault();
    this.numTouches += 1;
    this.update(ev);
  }

  handleTouchEnd(ev: TouchEvent) {
    ev.preventDefault();

    if (this.numTouches === 0 && this.touchEvents.length === 0 && this.detectedGesture === '') return;

    //console.warn('touchEnd!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

    this.detectGesture(this.tapDetector);
    this.detectGesture(this.swipeDetector);

    this.reset();
  }

  handleTouchMove(ev: TouchEvent) {
    ev.preventDefault();

    this.update(ev);

    this.detectGesture(this.panDetector);
    this.detectGesture(this.pinchDetector);
    // this.detectGesture(this.rotateDetector);
  }

  handleTouchCancel(ev: TouchEvent) {
    ev.preventDefault();

    //console.warn('touchCancel!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  }

  update(touchEvent: TouchEvent) {
    this.touchEvents.push(touchEvent);
  }

  reset() {
    this.numTouches = 0;
    this.touchEvents = [];
    this.detectedGesture = '';
  }

  private detectGesture(detector: BaseGestureDetector) {
    if (this.numTouches !== detector.numDesiredTouches) return;
    if (this.detectedGesture && this.detectedGesture !== detector.type) return;

    const gestureDetected = detector.detect(this.touchEvents, this.numTouches);
    if (!gestureDetected) return;

    this.detectedGesture = this.detectedGesture ? this.detectedGesture : detector.type;
    this.callbackFn(this.detectedGesture, detector.callbackValue);
  }
}

export default GestureHandler;
