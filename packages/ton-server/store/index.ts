import ShapeState, { ShapeStateType } from './shapeState';

export type State = {
  [shapeId: number]: ShapeStateType;
};

export type UpdateFn = (shapeId: number, newShapeState: ShapeStateType) => void;

class Store {
  shapeStates: ShapeState[] = [];

  get state(): State {
    return this.shapeStates.reduce(
      (state: State, shapeState) => ({
        ...state,
        [shapeState.shapeId]: shapeState.state,
      }),
      {}
    );
  }

  updateState(newState: State) {
    Object.keys(newState).forEach((_shapeId) => {
      const shapeId = Number(_shapeId);
      this._createOrSetShapeState(shapeId, newState[shapeId]);
    });
  }

  private _createOrSetShapeState(
    shapeId: number,
    newShapeState: ShapeStateType
  ) {
    if (!this.shapeStates[shapeId])
      this.shapeStates.push(new ShapeState(this.shapeStates.length));

    this.shapeStates[shapeId].state = newShapeState;
  }
}

export default Store;
