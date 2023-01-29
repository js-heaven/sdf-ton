import PanDetector from './pan';
import TapDetector from './tap';
import PinchDetector from './pinch';

export type GestureCallbackFn = (gestureType: string, otherArgs?: any) => void;

class GestureHandler {
  touchTarget: HTMLElement;
  callbackFn: GestureCallbackFn;

  tapDetector?: TapDetector;
  panDetector?: PanDetector;
  pinchDetector?: PinchDetector;

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
    this.panDetector = new PanDetector(ev);
    this.pinchDetector = new PinchDetector(ev);
  }

  handleTouchMove(ev: TouchEvent) {
    ev.preventDefault();

    this.panDetector?.update(ev);
    this.pinchDetector?.update(ev);
    this.detectGesture();
  }

  handleTouchEnd(ev: TouchEvent) {
    ev.preventDefault();

    this.tapDetector?.handleTouchEnd(ev);
    this.panDetector?.handleTouchEnd(ev);
    this.pinchDetector?.handleTouchEnd(ev);
    this.detectGesture();
  }

  detectGesture() {
    if (this.tapDetector?.isTapEvent) this.callbackFn(this.tapDetector.type);

    if (this.panDetector?.isPanEvent)
      this.callbackFn(this.panDetector.type, this.panDetector.distToStart);

    if (this.pinchDetector?.isPinchEvent)
      this.callbackFn(
        this.pinchDetector.type,
        this.pinchDetector.distRelativeToStart
      );
  }

  handleTouches(ev: TouchEvent) {
    ev.preventDefault();
  }
}

export default GestureHandler;
