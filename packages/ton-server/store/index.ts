import ShapeState, { ShapeStateType } from './shapeState';

export type State = {
  [shapeId: number]: ShapeStateType;
};

export type UpdateFn = (shapeId: number, newShapeState: ShapeStateType) => void;

class Store {
  shapeStates: ShapeState[] = [];

  constructor(numberOfShapes: number) {
    for (let i = 0; i < numberOfShapes; i++) {
      this.shapeStates.push(new ShapeState(i));
    }

  }

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
      this.shapeStates[shapeId].state = newState[shapeId];
    });
  }
}

export default Store;
