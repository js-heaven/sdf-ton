import { compileShaders, makeUniformLocationAccessor } from './shader-tools'

import sampleFs from './shaders/sample.fs'
import sampleVs from './shaders/sample.vs'

export default function startSampling(
  gl: WebGL2RenderingContext, 
  drawScreenQuad: () => void, 
  options: {
    radius: number, 
    sqrtBufferSize: number,
    numberOfBuffers: number,
  }
) {
  let bufferSize = options.sqrtBufferSize ** 2

  const sampleProgram = compileShaders(gl, sampleVs, sampleFs)
  const sampleUniLocs = makeUniformLocationAccessor(gl, sampleProgram)

  gl.useProgram(sampleProgram)
  gl.uniform1f(sampleUniLocs.sqrtBufferSize, options.sqrtBufferSize)
  gl.uniform1f(sampleUniLocs.oneByBufferSize, 1 / bufferSize)
  gl.uniform1f(sampleUniLocs.radius, options.radius)

  // create framebuffer with float texture
  const fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, options.sqrtBufferSize / 4, options.sqrtBufferSize, 0, gl.RGBA, gl.FLOAT, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)

  gl.clear(gl.COLOR_BUFFER_BIT)

  const frequency = 42 // 440 * 0.5 ** 4
  const BPM = 60
  const planeFrequency = 1 / (4 / (BPM / 60))
  let sampleRate = 42000
  let time = 0

  let planeStartAngle = 0
  let planeEndAngle = 0

  const samplePass = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo) 
    gl.viewport(0, 0, options.sqrtBufferSize / 4, options.sqrtBufferSize)

    gl.disable(gl.BLEND)

    gl.useProgram(sampleProgram)
    gl.uniform1f(sampleUniLocs.time, time)

    // calc time stuff
    let bufferDuration = bufferSize / sampleRate

    planeStartAngle = ((time * planeFrequency) % 1) * Math.PI * 2
    planeEndAngle = bufferDuration * planeFrequency * Math.PI * 2 + planeStartAngle
    gl.uniform1f(sampleUniLocs.planeStartAngle, planeStartAngle)
    gl.uniform1f(sampleUniLocs.planeEndAngle, planeEndAngle)

    let startAngle = ((time * frequency) % 1) * Math.PI * 2
    let endAngle = bufferDuration * frequency * Math.PI * 2 + startAngle
    gl.uniform1f(sampleUniLocs.startAngle, startAngle)
    gl.uniform1f(sampleUniLocs.endAngle, endAngle)

    time += bufferDuration

    drawScreenQuad()

    // read from framebuffer into array
    let data = new Float32Array(bufferSize)
    gl.readPixels(0, 0, options.sqrtBufferSize / 4, options.sqrtBufferSize, gl.RGBA, gl.FLOAT, data)

    // if(time > 2 && time < 3) {
    //   console.log(data.join(', '))
    // }

    return data
  }

  // sampling
  let periodLength = sampleRate / frequency
  let generatedBufferCounter = 0
  let periodStartSample = 0
  let bufferStartSample = 0
  let center = 1
  let normalizeFactor = 1
  const playButton = document.getElementById('play')!
  playButton.addEventListener('click', () => {
    playButton.style.display = 'none'

    const audioContext = new AudioContext();
    sampleRate = audioContext.sampleRate 
    audioContext.audioWorklet.addModule("./worklet.js").then(() => {
      const gainNode = new GainNode(audioContext, {gain: 0.0})
      gainNode.gain.setValueAtTime(0.0, audioContext.currentTime + 0.1)
      gainNode.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + 2)
      gainNode.connect(audioContext.destination)
      const continousBufferNode = new AudioWorkletNode(
        audioContext,
        "continous-buffer",
        {
          processorOptions: {
            sqrtBufferSize: options.sqrtBufferSize,
            numberOfBuffers: options.numberOfBuffers,
            avgFactor: 0.00001, 
            maxValue: options.radius
          }
        }
      );
      continousBufferNode.connect(gainNode);
      continousBufferNode.port.onmessage = (event) => {
        if(event.data.type == 'requestBuffer') {
          const a = samplePass()
          continousBufferNode.port.postMessage({
            type: 'buffer',
            buffer: a.buffer
          }, [a.buffer])
          console.log('generated buffer') 
          generatedBufferCounter += 1
          let assumedCurrentBuffer = generatedBufferCounter - options.numberOfBuffers
          periodLength = sampleRate / frequency
          bufferStartSample = assumedCurrentBuffer * bufferSize
          while(periodStartSample < bufferStartSample) {
            periodStartSample += periodLength
          }
        }
        if(event.data.type == 'normalizeInfo') {
          center = event.data.center
          normalizeFactor = event.data.normalizeFactor
        }
      }
      continousBufferNode.port.postMessage({
        type: 'start'
      })
    })
  })

  return {
    sampleTex: tex, 
    getPlaneSegment: () => {
      return [planeStartAngle, planeEndAngle]
    }, 
    getPeriodBeginAndLength: () => {
      return [periodStartSample - bufferStartSample, periodLength]
    }, 
    getNormalizeInfo: () => {
      return {
        center,
        normalizeFactor
      }
    }
  }
}
