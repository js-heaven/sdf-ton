import { Socket } from 'socket.io-client';
import ShapeState, { ShapeStateType } from './shape-state';

const scale = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1] // half tones at 2,3 and 7,8
// freqFactor ** 12 = 2, Oktave
// freqFactor = 2 ** -12
const halfToneStepFactor = Math.pow(2, 1/12)
let frequency = 55
const frequencies: number[] = []
for(let i = 0; i < 12 * 4 + 1; i++) {
  if(scale[i % 12]) {
    frequencies.push(frequency)
  }
  frequency *= halfToneStepFactor
}

const numberOfNotes = frequencies.length
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

  changeArpeggiatorId(shapeId: number, newArpeggiatorId: number) {
    this.shapeStates[shapeId].arpeggiatorId = newArpeggiatorId;
  }

  changeState(shapeId: number, newState: State) {
    this.shapeStates[shapeId].state = newState;
  }

  updatePanState(
    shapeId: number,
    newPanState: { deltaX: number; deltaY: number }
  ) {
    const sensitivity = 3;
    const { twist, shape } = this.shapeStates[shapeId];

    let newTwist = twist + sensitivity * (2 * newPanState.deltaY) / this.dimensions.height;
    newTwist = Math.min(newTwist, 1);
    newTwist = Math.max(newTwist, -1);

    let newShape = shape + sensitivity * newPanState.deltaX / this.dimensions.width;
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
    if (direction === 'left') this.arpeggiatorIdDown(shapeId);
    if (direction === 'right') this.arpeggiatorIdUp(shapeId);
  }

  noteUp(
    shapeId: number,
  ) {
    let newNote = this.shapeStates[shapeId].note + 1
    newNote = Math.min(newNote, numberOfNotes - 1)
    this.shapeStates[shapeId].note = newNote
  }

  noteDown(
    shapeId: number
  ) {
    let newNote = this.shapeStates[shapeId].note - 1
    newNote = Math.max(newNote, 0)
    this.shapeStates[shapeId].note = newNote
  }

  arpeggiatorIdDown(shapeId: number) {
    const oldArpeggiatorId = this.shapeStates[shapeId].arpeggiatorId;
    const newArpeggiatorId = oldArpeggiatorId - 1;
    this.changeArpeggiatorId(shapeId, newArpeggiatorId);
  }

  arpeggiatorIdUp(shapeId: number) {
    const oldArpeggiatorId = this.shapeStates[shapeId].arpeggiatorId;
    const newArpeggiatorId = oldArpeggiatorId + 1;
    this.changeArpeggiatorId(shapeId, newArpeggiatorId);
  }

  getFrequency(shapeId: number) {
    return frequencies[this.shapeStates[shapeId].note]
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
