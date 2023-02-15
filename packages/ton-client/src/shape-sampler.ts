import SoundRenderer from './rendering/sound-renderer';

export default class ShapeSampler {
  private bufferSize: number;
  private renderer: SoundRenderer;

  private generatedBufferCounter = 0
  private periodStartSample = 0
  private bufferStartSample = 0

  private frequency = 55

  private sampleRate = 44100
  private periodLength = this.sampleRate / this.frequency

  private _signalCenter = 1
  private _signalNormalizeFactor = 1

  private shapeId = 0

  constructor(
    gl: WebGL2RenderingContext,
    drawScreenQuad: () => void,
    setSdfUniforms: (uniLocs: any, shapeId: number) => void,
    private radius: number,
    private sqrtBufferSize: number,
    private numberOfBuffers: number,
  ) {
    this.renderer = new SoundRenderer(gl, drawScreenQuad, setSdfUniforms, sqrtBufferSize, 55, 0.5)
    this.bufferSize = sqrtBufferSize ** 2
  }

  setSampleRate(rate: number) {
    this.sampleRate = rate
    this.periodLength = rate / this.frequency
    this.renderer.setSampleRate(rate)
  }

  async start() {
    const audioContext = new AudioContext();
    this.setSampleRate(audioContext.sampleRate)

    await audioContext.audioWorklet.addModule("./worklet.js")

    const gainNode = new GainNode(audioContext, {gain: 0.0})
    const filterNode = audioContext.createBiquadFilter();
    filterNode.type = 'bandpass';
    filterNode.frequency.value = this.frequency;
    filterNode.Q.value = 1.;
    const reverbNode = await this.createReverbNode(audioContext)

    gainNode.gain.setValueAtTime(0.0, audioContext.currentTime + 0.1)
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 2)
    gainNode.connect(reverbNode)
    
    filterNode.connect(reverbNode)
    reverbNode.connect(audioContext.destination)
    const continousBufferNode = new AudioWorkletNode(
      audioContext,
      "continous-buffer",
      {
        // the following options get copied into another js execution context
        // any communication has to be done via messages
        processorOptions: {
          sqrtBufferSize: this.sqrtBufferSize,
          numberOfBuffers: this.numberOfBuffers,
          avgFactor: 0.00002,
          maxValue: this.radius
        }
      }
    );
    continousBufferNode.connect(gainNode);
    continousBufferNode.port.onmessage = (event) => {
      if(event.data.type == 'requestBuffer') {
        const a = this.renderer.samplePass(this.shapeId) 
        continousBufferNode.port.postMessage({
          type: 'buffer',
          buffer: a.buffer
        }, [a.buffer])
        this.generatedBufferCounter += 1
        const assumedCurrentBuffer = this.generatedBufferCounter - this.numberOfBuffers
        this.bufferStartSample = assumedCurrentBuffer * this.bufferSize
        this.periodLength = this.sampleRate / this.frequency
        while(this.periodStartSample < this.bufferStartSample) {
          this.periodStartSample += this.periodLength
        }
      }
      if(event.data.type == 'normalizeInfo') {
        this._signalCenter = event.data.center
        this._signalNormalizeFactor = event.data.normalizeFactor
      }
    }
    continousBufferNode.port.postMessage({
      type: 'start'
    })
  }

  get ready() {
    return this.generatedBufferCounter > 0
  }

  get firstPeriodOffset() {
    return this.periodStartSample - this.bufferStartSample
  }

  get firstPeriodLength() {
    return this.periodLength
  }

  get bufferTexture() {
    return this.renderer.texture
  }

  get scanSegment() : number[] {
    return this.renderer.scanSegment
  }

  get signalCenter() {
    return this._signalCenter
  }

  get signalNormalizeFactor() {
    return this._signalNormalizeFactor
  }

  async loadImpulseBuffer(ac: AudioContext, url: string) {
      return fetch(url)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => ac.decodeAudioData(arrayBuffer))
  }

  async createReverbNode(ac: AudioContext) {
    const convolver = ac.createConvolver()
    convolver.buffer = await this.loadImpulseBuffer(ac, 'impulse.wav')
    return convolver
  }
}

