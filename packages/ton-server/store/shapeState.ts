export type ShapeStateType = {
  twist?: number;
  bend?: number;
  bubbles?: number;
  shape?: number;
  fx?: string;
  note?: number;
  arpeggioId?: number;
};

class ShapeState {
  shapeId: number;

  twist = 0;
  bend = 0;
  bubbles = 0;
  shape = 0;
  fx = 'none';
  note = 14;
  arpeggioId = 0;

  private _state: ShapeStateType = {
    twist: this.twist,
    bend: this.bend,
    bubbles: this.bubbles,
    shape: this.shape,
    fx: this.fx,
    note: this.note,
    arpeggioId: this.arpeggioId,
  };

  constructor(shapeId: number) {
    this.shapeId = shapeId;
  }

  set state(newState: ShapeStateType) {
    Object.assign(this, newState);

    this._state = {
      twist: this.twist,
      bend: this.bend,
      bubbles: this.bubbles,
      shape: this.shape,
      fx: this.fx,
      note: this.note,
      arpeggioId: this.arpeggioId,
    };
  }

  get state() {
    return this._state;
  }
}

export default ShapeState;
