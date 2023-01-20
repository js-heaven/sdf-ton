class ContinousBuffer extends AudioWorkletProcessor {

  mid = 0.5;

  buffers = [];
  currentBuffer = undefined;
  bufferPointer = 0; // next buffer pointer
  nextBuffer = 0; 

  constructor() {
    super()
    this.bufferSize = 4096; //bufferSize;
    this.bufferCount = 3; 
    this.avgFactor = 0.00001;
    this.port.onmessage = this.handleMessage.bind(this);
  }

  // die Idee ist, dass der Audiobuffer immer rechtzeitig gefüllt wird
  // ich würde sagen, die erste buffer message startet das playback
  // wenn die buffer ausgehen, dann wird gesoppt

  handleMessage(event) {
    if(event.data.type === 'buffer') {
      if(this.currentBuffer === undefined) {
        this.buffers[0] = new Float32Array(event.data.buffer)
        this.currentBuffer = 0;
        this.bufferPointer = 0; 
        this.nextBuffer = 1; 
      } else if (this.currentBuffer == this.nextBuffer) {
        throw('too many buffers');
      } else {
        this.buffers[this.nextBuffer] = event.data.buffer;
        console.log('writing to buffer', this.nextBuffer)
        this.nextBuffer = (this.nextBuffer + 1) % this.bufferCount;
      }
    }
    if(event.data.type === 'start') {
      for(let i = 0; i < this.bufferCount; i++) {
        this.port.postMessage({
          type: 'requestBuffer'
        })
      }
    }
  }

  switchToNextBuffer() {
    this.currentBuffer += 1
    this.currentBuffer %= this.bufferCount
    this.bufferPointer = 0
    console.log('nextBuffer', this.currentBuffer)
    if(this.currentBuffer === this.nextBuffer) {
      this.currentBuffer = undefined
    }
    this.port.postMessage({
      type: 'requestBuffer'
    })
  }

  process(_inputs, outputs, _parameters) {
    const channel = outputs[0][0]
    let v = 0
    let ci = 0
    let done = false 
    while(!done) {
      // if no buffer is available, stop
      if(this.currentBuffer === undefined) {
        console.log('missing buffer')
        done = true
        break
      } 
      console.log('have buffer')
      // expect to be able to fill the whole channel from the current buffer
      done = true
      for (ci; ci < channel.length; ci++) {
        v = this.buffers[this.currentBuffer][this.bufferPointer]
        this.bufferPointer += 1
        channel[ci] = v // - this.mid
        // mid = mid * (1 - avgFactor) + v * avgFactor

        if(this.bufferPointer >= this.bufferSize) {
          // need to continue with next buffer
          done = false
          this.switchToNextBuffer()
          break
        }
      }
    }
    // fill rest with silence
    for (ci; ci < channel.length; ci++) {
      channel[ci] = 0;
    }
    return true;
  }
}

registerProcessor("continous-buffer", ContinousBuffer);

