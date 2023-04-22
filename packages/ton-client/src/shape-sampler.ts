import SoundRenderer from './rendering/sound-renderer';

import arps from './arps'
import BarClock from './bar-clock'

import config from './config';

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


  constructor(
    gl: WebGL2RenderingContext,
    drawScreenQuad: () => void,
    setSdfUniforms: (uniLocs: any, shapeId: number) => void,
    private radius: number,
    private sqrtBufferSize: number,
    private numberOfBuffers: number,
    private getFrequency: (shapeId: number) => number,
    private getArpeggioId: (shapeId: number) => number, 
    private shapeId: number
  ) {
    this.renderer = new SoundRenderer(
      gl, drawScreenQuad, setSdfUniforms, sqrtBufferSize, this.frequency, 1 / (config.barDuration * 2)
    ) 
    this.bufferSize = sqrtBufferSize ** 2
  }

  setSampleRate(rate: number) {
    this.sampleRate = rate
    this.renderer.setSampleRate(rate)
    this.updatePeriodLength()
  }

  setFrequency(frequency: number) {
    this.frequency = frequency
    this.renderer.setFrequency(frequency)
    this.updatePeriodLength()
  }

  updatePeriodLength() {
    this.periodLength = this.sampleRate / this.frequency
  }

  async start(barClock: BarClock) {
    const ac = new AudioContext();

    this.setSampleRate(ac.sampleRate)

    await ac.audioWorklet.addModule("./worklet.js")

    const reverbNode = await this.createReverbNode(ac)
    reverbNode.connect(ac.destination)

    const gainNode = new GainNode(ac, {gain: 0.0})

    gainNode.gain.setValueAtTime(0.0, ac.currentTime + 0)
    gainNode.gain.linearRampToValueAtTime(0.01, ac.currentTime + 0.1)
    gainNode.connect(reverbNode)

    const prepareGainNodeForTheNextBar = (bar: number, start: number) => {
      const arpId = this.getArpeggioId(this.shapeId) 
      const arp = arps[arpId]

      const slotDuration = config.barDuration / arp.slotsPerBar

      arp.triggers.forEach(t => {
        gainNode.gain.setValueAtTime(0.01, start + (t.slot) * slotDuration)
        gainNode.gain.linearRampToValueAtTime(1, start + (arp.attack + t.slot) * slotDuration)
        gainNode.gain.exponentialRampToValueAtTime(arp.sustain, start + (t.slot + t.length) * slotDuration) 
        gainNode.gain.exponentialRampToValueAtTime(0.01, start + (t.slot + t.length + arp.decay) * slotDuration) 
      })

      setTimeout(() => {
        prepareGainNodeForTheNextBar(bar + 1, ac.currentTime + barClock.nextBarIn())
      }, 1000 * config.barDuration - 300) // always schedule arp setting 300ms before next bar
    }

    prepareGainNodeForTheNextBar(0, ac.currentTime + barClock.nextBarIn())
    
    const continousBufferNode = new AudioWorkletNode(
      ac,
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
    continousBufferNode.port.onmessage = (event) => {
      if(event.data.type == 'requestBuffer') {
        this.setFrequency(this.getFrequency(this.shapeId)) // update frequency
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
    continousBufferNode.connect(gainNode);
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

