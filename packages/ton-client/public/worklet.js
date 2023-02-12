let globalI = 0

class ContinousBuffer extends AudioWorkletProcessor {

  center = 1;
  normalizeFactor = 1; 

  buffers = [];
  currentBuffer = undefined;
  bufferPointer = 0; // next buffer pointer
  nextBuffer = 0; 

  constructor(options) {
    super()

    this.sqrtBufferSize = options.processorOptions.sqrtBufferSize
    this.bufferSize = this.sqrtBufferSize * this.sqrtBufferSize
    this.numberOfBuffers = options.processorOptions.numberOfBuffers
    this.avgFactor = options.processorOptions.avgFactor
    this.maxValue = options.processorOptions.maxValue

    // initialize min to the max and vice versa
    // such that the first read sample defines both
    this.min = this.maxValue
    this.max = 0

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
        console.error('too many buffers, ignoring one.')
      } else {
        this.buffers[this.nextBuffer] = new Float32Array(event.data.buffer)
        this.nextBuffer = (this.nextBuffer + 1) % this.numberOfBuffers;
      }
    }
    if(event.data.type === 'start') {
      for(let i = 0; i < this.numberOfBuffers; i++) {
        this.port.postMessage({
          type: 'requestBuffer'
        })
      }
    }
  }

  switchToNextBuffer() {
    this.currentBuffer += 1
    this.currentBuffer %= this.numberOfBuffers
    this.bufferPointer = 0
    if(this.currentBuffer === this.nextBuffer) {
      this.currentBuffer = undefined
      console.error('crackel: starving, no sample buffer available')
    }
    this.port.postMessage({
      type: 'requestBuffer'
    })
  }

  process(_inputs, outputs, _parameters) {
    const channel = outputs[0][0]

    // performance optimization: use plain variables
    // will be copied back at the end
    let min = this.min 
    let max = this.max
    let normalizeFactor = this.normalizeFactor 
    let center = this.center

    let midFactor = this.avgFactor
    let prevMidFactor = 1 - midFactor

    // helpers
    let sample = 0
    let channelIndex = 0

    let done = false 
    while(!done && this.currentBuffer !== undefined) {
      let buffer = this.buffers[this.currentBuffer]
      let bufferPointer = this.bufferPointer

      // calculate how many samples we draw from the current buffer
      let freeSpaceOnBuffer = this.bufferSize - bufferPointer 
      let requiredSpaceForChannel = channel.length - channelIndex
      let sampleCount = Math.min(freeSpaceOnBuffer, requiredSpaceForChannel)

      let until = channelIndex + sampleCount
      for (channelIndex; channelIndex < until; channelIndex++) {
        sample = buffer[bufferPointer]
        bufferPointer += 1
        min += 0.0000011
        max -= 0.0000011
        if(sample < min) min = sample
        if(sample > max) max = sample
        center = center * prevMidFactor + sample * midFactor
        normalizeFactor = 0.8 / Math.max(
          center - min, 
          max - center
        )
        sample = (sample - center) * normalizeFactor
        channel[channelIndex] = sample
      }
      
      // are we done yet? 
      if(requiredSpaceForChannel < freeSpaceOnBuffer) {
        this.bufferPointer += requiredSpaceForChannel
        done = true
      } else {
        // continue with next buffer
        this.switchToNextBuffer()
        done = false
      }
    }

    // pad rest with silence, if there wasn't enough data
    for (channelIndex; channelIndex < channel.length; channelIndex++) {
      channel[channelIndex] = 0;
    }

    // copy back
    this.min = min
    this.max = max
    this.normalizeFactor = normalizeFactor
    this.center = center

    this.port.postMessage({
      type: 'normalizeInfo', 
      center: this.center, 
      normalizeFactor: this.normalizeFactor
    }) 
    return true;
  }
}

registerProcessor("continous-buffer", ContinousBuffer);

