import { Socket } from 'socket.io-client';
import ShapeState, { ShapeStateType } from './shape-state';

type Dimensions = {
  height: number;
  width: number;
};

type State = {
  [shapeId: number]: ShapeStateType;
};

class Store {
  private _socket: Socket;

  dimensions: Dimensions = { width: 1, height: 1 };
  shapeStates: ShapeState[] = [];

  constructor(socket: Socket, numberOfShapes: number) {
    this._socket = socket;
    for (let i = 0; i < numberOfShapes; i++) {
      this.shapeStates.push(new ShapeState(numberOfShapes, this._updateFn));
    }

    this._registerSocketListeners();
  }

  changeTwist(shapeId: number, newTwist: number) {
    this.shapeStates[shapeId].twist = newTwist;
  }

  changeBend(shapeId: number, newBend: number) {
    this.shapeStates[shapeId].bend = newBend;
  }

  changeBubbleLevel(shapeId: number, newBubbleLevel: number) {
    this.shapeStates[shapeId].bubbles = newBubbleLevel;
  }

  changeShape(shapeId: number, newShape: string) {
    this.shapeStates[shapeId].shape = newShape;
  }

  changeFx(shapeId: number, newFx: string) {
    this.shapeStates[shapeId].fx = newFx;
  }

  changeNote(shapeId: number, newNote: string) {
    this.shapeStates[shapeId].note = newNote;
  }

  changeState(shapeId: number, newState: State) {
    this.shapeStates[shapeId].state = newState;
  }

  updatePanState(
    shapeId: number,
    newPanState: { deltaX: number; deltaY: number }
  ) {
    const { twist, shape } = this.shapeStates[shapeId];

    let newTwist = twist + (2 * newPanState.deltaY) / this.dimensions.height;
    newTwist = Math.min(newTwist, 1);
    newTwist = Math.max(newTwist, -1);

    const newShape = shape + newPanState.deltaX;

    this.shapeStates[shapeId].twist = newTwist;
    this.shapeStates[shapeId].shape = newShape;
  }

  set state(newState: State) {
    Object.keys(newState).forEach((_shapeId) => {
      const shapeId = Number(_shapeId);
      this._createOrSetShapeState(shapeId, newState[shapeId]);
    });
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

  private _registerSocketListeners() {
    this._socket.on('updateState', (newState: State) => {
      this.state = newState;
    });
  }

  private _pushState(newState: State) {
    this._socket.emit('pushState', newState);
  }

  private _updateFn = (shapeId: number, newState: ShapeStateType) => {
    this._pushState({ [shapeId]: newState });
  }

  private _createOrSetShapeState(
    shapeId: number,
    newShapeState: ShapeStateType
  ) {
    if (!this.shapeStates[shapeId])
      this.shapeStates.push(
        new ShapeState(this.shapeStates.length, this._updateFn)
      );

    this.shapeStates[shapeId].state = newShapeState;
  }
}

export default Store;
