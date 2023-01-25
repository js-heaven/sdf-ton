class ContinousBuffer extends AudioWorkletProcessor {

  mid = 0.5;
  normalizeFactor = 1; 

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
        console.warning('too many buffers, ignoring one.')
      } else {
        this.buffers[this.nextBuffer] = new Float32Array(event.data.buffer)
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
    if(this.currentBuffer === this.nextBuffer) {
      this.currentBuffer = undefined
      console.warning('no buffer available')
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
        done = true
        break
      } 
      done = true
      let buffer = this.buffers[this.currentBuffer]
      for (ci; ci < channel.length; ci++) {
        v = buffer[this.bufferPointer]
        v = v * 2 - 1
        if(Math.abs(v) * this.normalizeFactor > 1) {
          console.log('had to correct normalize') 
          this.normalizeFactor = 1 / Math.abs(v)
        } 
        v *= this.normalizeFactor 
        channel[ci] = v - this.mid 
        this.mid = this.mid * (1 - this.avgFactor) + v * this.avgFactor

        this.bufferPointer += 1
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

