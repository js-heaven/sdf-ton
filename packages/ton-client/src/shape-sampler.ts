import SoundRenderer from './rendering/sound-renderer';

interface Trigger {
  slot: number, 
  length: number
}

class ArpeggiatorPattern {

  public triggers: Trigger[] = []

  constructor(
    public slotsPerBar = 16,  
    public attack = 0.05,  // of a slot
    public sustain = 0.5, 
    public decay = 1, // of a slot
    density: number
  ) {
    this.fillRandom(density) 
  }

  fillRandom(density: number) {
    let nextSlotWithANote = undefined

    // generate triggers in reverse order
    let i = this.slotsPerBar
    while(i > 0) {
      i -= 1
      if(Math.random() < density) {
        let noteLength = 0
        if(nextSlotWithANote) {
          noteLength = Math.round(
            Math.random() * (nextSlotWithANote - i)
          ) // 
        }
        nextSlotWithANote = i
        this.triggers.push({
          slot: i, 
          length: noteLength
        })
      }
    }
    const lastTrigger = this.triggers[0]

    // !!! trigger order gets reversed here
    this.triggers.reverse()

    lastTrigger.length = Math.random() * (this.slotsPerBar + this.triggers[0].slot - lastTrigger.slot)
  }
}

const arps: ArpeggiatorPattern[] = []

const NUMBER_OF_ARPS = 40

for(let i = 0; i < NUMBER_OF_ARPS; i++) {
  arps.push(new ArpeggiatorPattern(
    4 * (2 + Math.trunc(Math.random() * 5)), 
    Math.random(),
    Math.random(),
    Math.trunc(Math.random() * 8) / 4, 
    Math.random() * 0.5 + 0.25
  ))
}

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

  private barDuration = 2 // sekunden

  constructor(
    gl: WebGL2RenderingContext,
    drawScreenQuad: () => void,
    setSdfUniforms: (uniLocs: any, shapeId: number) => void,
    private radius: number,
    private sqrtBufferSize: number,
    private numberOfBuffers: number,
    private getFrequency: (shapeId: number) => number,
    private getArpeggiatorId: (shapeId: number) => number, 
    private shapeId: number
  ) {
    this.renderer = new SoundRenderer(gl, drawScreenQuad, setSdfUniforms, sqrtBufferSize, this.frequency, 0.125)
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

  async start() {
    const audioContext = new AudioContext();
    this.setSampleRate(audioContext.sampleRate)

    await audioContext.audioWorklet.addModule("./worklet.js")

    const gainNode = new GainNode(audioContext, {gain: 0.0})

    //const filterNode = audioContext.createBiquadFilter();
    //filterNode.type = 'bandpass';
    //filterNode.frequency.value = this.frequency;
    //filterNode.Q.value = 1.;
    const reverbNode = await this.createReverbNode(audioContext)

    gainNode.gain.setValueAtTime(0.0, audioContext.currentTime + 0)
    gainNode.gain.linearRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
    gainNode.connect(reverbNode)

    const prepareGainNodeForTheNextBar = (bar: number, start: number) => {
      let arpId = this.getArpeggiatorId(this.shapeId)
      if(arpId < 0) {
        arpId = NUMBER_OF_ARPS - arpId
      }
      arpId = arpId % NUMBER_OF_ARPS
      const arp = arps[arpId]

      const slotDuration = this.barDuration / arp.slotsPerBar

      arp.triggers.forEach(t => {
        gainNode.gain.setValueAtTime(0.01, start + (t.slot) * slotDuration)
        gainNode.gain.linearRampToValueAtTime(1, start + (arp.attack + t.slot) * slotDuration)
        gainNode.gain.exponentialRampToValueAtTime(arp.sustain, start + (t.slot + t.length) * slotDuration) 
        gainNode.gain.exponentialRampToValueAtTime(0.01, start + (t.slot + t.length + arp.decay) * slotDuration) 
      })

      const now = audioContext.currentTime
      const nextBarStart = start + this.barDuration

      setTimeout(() => {
        prepareGainNodeForTheNextBar(bar + 1, start + this.barDuration)
      }, 1000 * ((nextBarStart - now) - 0.1) ) // always schedule arp setting 100ms before next bar
    }

    const start = (0.001 * Date.now() + this.barDuration - 0.1) % this.barDuration + 0.1 // sync a bit
    prepareGainNodeForTheNextBar(0, start)
    
    //filterNode.connect(reverbNode)
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

