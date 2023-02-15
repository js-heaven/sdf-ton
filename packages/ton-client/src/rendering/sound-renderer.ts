import { compileShaders, makeUniformLocationAccessor } from './shader-tools'
import vs from './shaders/sample.vs'
import fs from './shaders/sample.fs'

export default class CubeRenderer {
  private program: WebGLProgram; 
  private uniLocs: any; 

  private fbo: WebGLFramebuffer
  private tex: WebGLTexture

  private bufferSize: number

  private sampleRate = 44100

  private time = 0

  private planeStartAngle = 0
  private planeEndAngle = 0

  constructor(
    private gl: WebGL2RenderingContext, 
    private drawScreenQuad: () => void, 
    private setSdfUniforms: (uniLocs: any, shapeId: number) => void,
    private sqrtBufferSize: number, 
    private frequency: number, 
    private planeFrequency: number
  ) {
    this.bufferSize = sqrtBufferSize ** 2

    this.program = compileShaders(gl, vs, fs)
    this.uniLocs = makeUniformLocationAccessor(gl, this.program)

    gl.useProgram(this.program)
    gl.uniform1f(this.uniLocs.sqrtBufferSize, this.sqrtBufferSize)
    gl.uniform1f(this.uniLocs.oneByBufferSize, 1 / this.bufferSize)
    gl.uniform1f(this.uniLocs.radius, 5)


    // create framebuffer with float texture
    this.fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)

    this.tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.sqrtBufferSize / 4, this.sqrtBufferSize, 0, gl.RGBA, gl.FLOAT, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0)

    gl.clearColor(0,0,0,0)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  setSampleRate(sampleRate: number) {
    this.sampleRate = sampleRate
  }

  samplePass (shapeId) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo)
    this.gl.viewport(0, 0, this.sqrtBufferSize / 4, this.sqrtBufferSize)

    this.gl.disable(this.gl.BLEND)
    this.gl.disable(this.gl.DEPTH_TEST)
    this.gl.disable(this.gl.CULL_FACE)

    this.gl.useProgram(this.program)

    // calc time stuff
    const bufferDuration = this.bufferSize / this.sampleRate

    this.planeStartAngle = ((this.time * this.planeFrequency) % 1) * Math.PI * 2
    this.planeEndAngle = bufferDuration * this.planeFrequency * Math.PI * 2 + this.planeStartAngle

    this.gl.uniform1f(this.uniLocs.planeStartAngle, this.planeStartAngle)
    this.gl.uniform1f(this.uniLocs.planeEndAngle, this.planeEndAngle)

    const startAngle = ((this.time * this.frequency) % 1) * Math.PI * 2
    const endAngle = bufferDuration * this.frequency * Math.PI * 2 + startAngle
    this.gl.uniform1f(this.uniLocs.startAngle, startAngle)
    this.gl.uniform1f(this.uniLocs.endAngle, endAngle)

    this.time += bufferDuration

    this.setSdfUniforms(this.uniLocs, shapeId)

    this.drawScreenQuad()

    // read from framebuffer into array
    const data = new Float32Array(this.bufferSize)
    this.gl.readPixels(0, 0, this.sqrtBufferSize / 4, this.sqrtBufferSize, this.gl.RGBA, this.gl.FLOAT, data)

    return data
  }

  get texture() {
    return this.tex
  }

  get scanSegment() : number[] {
    return [this.planeStartAngle, this.planeEndAngle]
  }
}
