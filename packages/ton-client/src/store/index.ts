import { Socket } from 'socket.io-client';
import ShapeState, { ShapeStateType } from './shape-state';
import config from '../config';

const baseNote = 7 * 2

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

  constructor(
    socket: Socket,
    numberOfShapes: number,
    private numberOfSdfVariants: number
  ) {
    this._socket = socket;
    for (let i = 0; i < numberOfShapes; i++) {
      const shapeState = new ShapeState(i, this._updateFn, baseNote + i * 2);
      this.shapeStates.push(shapeState);
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

  changeShape(shapeId: number, newShape: number) {
    this.shapeStates[shapeId].shape = newShape;
  }

  changeFx(shapeId: number, newFx: string) {
    this.shapeStates[shapeId].fx = newFx;
  }

  changeNote(shapeId: number, newNote: number) {
    this.shapeStates[shapeId].note = newNote;
  }

  changeArpeggioId(shapeId: number, newArpeggioId: number) {
    this.shapeStates[shapeId].arpeggioId = newArpeggioId;
  }

  changeState(shapeId: number, newState: State) {
    this.shapeStates[shapeId].state = newState;
  }

  updatePanState(
    shapeId: number,
    newPanState: { deltaX: number; deltaY: number }
  ) {
    const { twist, shape } = this.shapeStates[shapeId];

    let newTwist = twist + 2 * newPanState.deltaY / this.dimensions.height;
    newTwist = Math.min(newTwist, 1);
    newTwist = Math.max(newTwist, -1);

    let newShape = shape + 2 * newPanState.deltaX / this.dimensions.width;
    while(newShape < 0) newShape += this.numberOfSdfVariants;
    newShape = newShape % this.numberOfSdfVariants;

    this.shapeStates[shapeId].twist = newTwist;
    this.shapeStates[shapeId].shape = newShape;
  }

  updateSwipeState(
    shapeId: number,
    direction: string
  ) {
    if (direction === 'up') this.noteUp(shapeId);
    if (direction === 'down') this.noteDown(shapeId);
    if (direction === 'left') this.arpeggioIdDown(shapeId);
    if (direction === 'right') this.arpeggioIdUp(shapeId);
  }

  noteUp(
    shapeId: number,
  ) {
    let newNote = this.shapeStates[shapeId].note + 1
    newNote = Math.min(newNote, config.numberOfFreqs - 1)
    this.shapeStates[shapeId].note = newNote
  }

  noteDown(
    shapeId: number
  ) {
    let newNote = this.shapeStates[shapeId].note - 1
    newNote = Math.max(newNote, 0)
    this.shapeStates[shapeId].note = newNote
  }

  arpeggioIdDown(shapeId: number) {
    let newArpeggioId = this.shapeStates[shapeId].arpeggioId - 1; 
    if(newArpeggioId < 0) {
      newArpeggioId += config.numberOfArps;
    }
    this.changeArpeggioId(shapeId, newArpeggioId);
  }

  arpeggioIdUp(shapeId: number) {
    let newArpeggioId = this.shapeStates[shapeId].arpeggioId + 1;
    if(newArpeggioId >= config.numberOfArps) {
      newArpeggioId = 0;
    }
    this.changeArpeggioId(shapeId, newArpeggioId);
  }

  set state(newState: State) {
    Object.keys(newState).forEach((_shapeId) => {
      const shapeId = Number(_shapeId);
      this.shapeStates[shapeId].state = newState[shapeId];
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
}

export default Store;
