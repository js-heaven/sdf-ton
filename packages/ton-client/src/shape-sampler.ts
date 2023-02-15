import SoundRenderer from './rendering/sound-renderer';

export default class ShapeSampler {
  private bufferSize: number;
  private renderer: SoundRenderer;

  private generatedBufferCounter = 0
  private periodStartSample = 0
  private bufferStartSample = 0

  private frequency = 55

  private sampleRate 
  private periodLength

  private center = 1
  private normalizeFactor = 1

  constructor(
    gl: WebGL2RenderingContext,
    private drawScreenQuad: () => void,
    private setSdfUniforms: (uniLocs: any) => void,
    private radius: number,
    private sqrtBufferSize: number,
    private numberOfBuffers: number,
  ) {
    this.renderer = new SoundRenderer(gl, drawScreenQuad, setSdfUniforms, sqrtBufferSize, 55, 0.5)
    this.bufferSize = sqrtBufferSize ** 2
    this.setSampleRate(42000)
  }

  setSampleRate(rate: number) {
    this.sampleRate = rate
    this.periodLength = rate / this.frequency
  }

  start() {
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
        const a = this.renderer.samplePass()
        continousBufferNode.port.postMessage({
          type: 'buffer',
          buffer: a.buffer
        }, [a.buffer])
        this.generatedBufferCounter += 1
        const assumedCurrentBuffer = this.generatedBufferCounter - this.numberOfBuffers
        this.periodLength = this.sampleRate / this.frequency
        this.bufferStartSample = assumedCurrentBuffer * this.bufferSize
        while(this.periodStartSample < this.bufferStartSample) {
          this.periodStartSample += this.periodLength
        }
      }
      if(event.data.type == 'normalizeInfo') {
        this.center = event.data.center
        this.normalizeFactor = event.data.normalizeFactor
      }
    }
    continousBufferNode.port.postMessage({
      type: 'start'
    })
  }

  isReady() {
    return this.generatedBufferCounter > 0
  }

  getPeriodBeginAndLength() {
    return [
      this.periodStartSample - this.bufferStartSample, 
      this.periodLength
    ]
  }

  getSampleTexture() {
    return this.renderer.getSampleTex()
  }

  getPlaneSegment() : number[] {
    return this.renderer.getPlaneSegment()
  }

  getNormalizeInfo() {
    return {
      center: this.center, 
      normalizeFactor: this.normalizeFactor
    }
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

