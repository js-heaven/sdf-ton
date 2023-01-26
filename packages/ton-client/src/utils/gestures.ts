import SwipeDetector from './swipe';
import TapDetector from './tap';

export const GESTURE_TYPES = {
  tap: 'tap',
  swipe: 'swipe',
  pinch: 'pinch',
  none: 'none',
};

export type GestureCallbackFn = (gestureType: string, otherArgs?: any) => void;

class GestureHandler {
  touchTarget: HTMLElement;
  callbackFn: GestureCallbackFn;

  tapDetector?: TapDetector;
  swipeDetector?: SwipeDetector;

  constructor(touchTarget: HTMLElement, callbackFn: GestureCallbackFn) {
    this.callbackFn = callbackFn;
    this.touchTarget = touchTarget || document;
    this.addEventListeners();
  }

  addEventListeners() {
    this.touchTarget.addEventListener(
      'touchstart',
      this.handleTouchStart.bind(this),
      false
    );
    this.touchTarget.addEventListener(
      'touchmove',
      this.handleTouchMove.bind(this),
      false
    );
    this.touchTarget.addEventListener(
      'touchcancel',
      this.handleTouches.bind(this),
      false
    );
    this.touchTarget.addEventListener(
      'touchend',
      this.handleTouchEnd.bind(this),
      false
    );
  }

  handleTouchStart(ev: TouchEvent) {
    this.tapDetector = new TapDetector(ev);
    this.swipeDetector = new SwipeDetector(ev);
  }

  handleTouchMove(ev: TouchEvent) {
    this.swipeDetector?.update(ev);
    this.detectGesture();
  }

  handleTouchEnd(ev: TouchEvent) {
    ev.preventDefault();

    this.tapDetector?.update(ev);
    this.detectGesture();
  }

  detectGesture() {
    if (this.tapDetector?.isTapEvent) return this.callbackFn(GESTURE_TYPES.tap);
    if (this.swipeDetector?.isSwipeEvent)
      return this.callbackFn(
        GESTURE_TYPES.swipe,
        this.swipeDetector.distanceToStart
      );
  }

  handleTouches(ev: TouchEvent) {
    ev.preventDefault();
  }
}

export default GestureHandler;
