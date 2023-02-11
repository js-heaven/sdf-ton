import PanDetector from './pan';
import TapDetector from './tap';
import PinchDetector from './pinch';
import GestureDetector, { GestureCallbackFn } from './gesture-detector';

class GestureHandler {
  touchTarget: HTMLElement;
  callbackFn: GestureCallbackFn;

  tapDetector?: TapDetector;
  panDetector?: PanDetector;
  pinchDetector?: PinchDetector;

  gestureDetector?: GestureDetector;

  constructor(touchTarget: HTMLElement, callbackFn: GestureCallbackFn) {
    this.callbackFn = callbackFn;
    this.touchTarget = touchTarget || document;

    this.addEventListeners();
  }

  addEventListeners() {
    this.touchTarget.addEventListener(
      'touchstart',
      this.handleTouchStart.bind(this)
    );

    this.touchTarget.addEventListener(
      'touchmove',
      this.handleTouchMove.bind(this)
    );
    this.touchTarget.addEventListener(
      'touchcancel',
      this.handleTouchCancel.bind(this)
    );
    this.touchTarget.addEventListener(
      'touchend',
      this.handleTouchEnd.bind(this)
    );
  }

  handleTouchStart(ev: TouchEvent) {
    if (this.gestureDetector) {
      this.gestureDetector.addTouch(ev);
      return;
    }

    console.warn('touchStart!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

    this.gestureDetector = new GestureDetector(ev, this.callbackFn);
  }

  handleTouchEnd(ev: TouchEvent) {
    ev.preventDefault();

    if (!this.gestureDetector) return;

    console.warn('touchEnd!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.log(this.gestureDetector.touchEvents);

    this.gestureDetector.handleTouchEnd();
    this.gestureDetector = undefined;
  }

  handleTouchMove(ev: TouchEvent) {
    ev.preventDefault();

    this.gestureDetector?.handleTouchMove(ev);
  }

  handleTouchCancel(ev: TouchEvent) {
    ev.preventDefault();

    console.warn('touchCancel!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  }
}

export default GestureHandler;
