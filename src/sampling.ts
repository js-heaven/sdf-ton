import { compileShaders, makeUniformLocationAccessor } from './shader-tools'

import sampleFs from './shaders/sample.fs'
import sampleVs from './shaders/sample.vs'

// sqrt buffer size has to be dividable by 4 because we're forced to render to RGBA32F
const SQRT_BUFFER_SIZE = 64 // BUFFER_SIZE 4096
const BUFFER_SIZE = SQRT_BUFFER_SIZE ** 2

export default function startSampling(
  gl: WebGL2RenderingContext, 
  drawScreenQuad: () => void, 
  radius: number
) {

  const sampleProgram = compileShaders(gl, sampleVs, sampleFs)
  const sampleUniLocs = makeUniformLocationAccessor(gl, sampleProgram)

  gl.useProgram(sampleProgram)
  gl.uniform1f(sampleUniLocs.sqrtBufferSize, SQRT_BUFFER_SIZE)
  gl.uniform1f(sampleUniLocs.oneByBufferSize, 1 / BUFFER_SIZE)
  gl.uniform1f(sampleUniLocs.radius, radius)

  // create framebuffer with float texture
  const fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, SQRT_BUFFER_SIZE / 4, SQRT_BUFFER_SIZE, 0, gl.RGBA, gl.FLOAT, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)

  gl.clear(gl.COLOR_BUFFER_BIT)

  const frequency = 440 * 0.5 ** 3
  const BPM = 90
  const planeFrequency = 1 / (4 / (BPM / 60))
  let sampleRate = 42000
  let time = 0
  const samplePass = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo) 
    gl.viewport(0, 0, SQRT_BUFFER_SIZE / 4, SQRT_BUFFER_SIZE)

    gl.disable(gl.BLEND)

    gl.useProgram(sampleProgram)
    gl.uniform1f(sampleUniLocs.time, time)

    // calc time stuff
    let bufferDuration = BUFFER_SIZE / sampleRate

    let planeStartAngle = ((time * planeFrequency) % 1) * Math.PI * 2
    let planeEndAngle = bufferDuration * planeFrequency * Math.PI * 2 + planeStartAngle
    gl.uniform1f(sampleUniLocs.planeStartAngle, planeStartAngle)
    gl.uniform1f(sampleUniLocs.planeEndAngle, planeEndAngle)

    let startAngle = ((time * frequency) % 1) * Math.PI * 2
    let endAngle = bufferDuration * frequency * Math.PI * 2 + startAngle
    gl.uniform1f(sampleUniLocs.startAngle, startAngle)
    gl.uniform1f(sampleUniLocs.endAngle, endAngle)

    time += bufferDuration

    drawScreenQuad()

    // read from framebuffer into array
    let data = new Float32Array(BUFFER_SIZE)
    gl.readPixels(0, 0, SQRT_BUFFER_SIZE / 4, SQRT_BUFFER_SIZE, gl.RGBA, gl.FLOAT, data)

    // if(time > 2 && time < 3) {
    //   console.log(data.join(', '))
    // }

    return data
  }

  // sampling
  const playButton = document.getElementById('play')!
  playButton.addEventListener('click', () => {
    playButton.style.display = 'none'

    const audioContext = new AudioContext();
    sampleRate = audioContext.sampleRate 
    audioContext.audioWorklet.addModule("./worklet.js").then(() => {
      const continousBufferNode = new AudioWorkletNode(
        audioContext,
        "continous-buffer"
      );
      continousBufferNode.connect(audioContext.destination);
      continousBufferNode.port.onmessage = (event) => {
        if(event.data.type == 'requestBuffer') {
          const a = samplePass()
          continousBufferNode.port.postMessage({
            type: 'buffer',
            buffer: a.buffer
          }, [a.buffer])
        }
      }
      continousBufferNode.port.postMessage({
        type: 'start'
      })
    })
  })

  return tex
}
