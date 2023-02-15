import { compileShaders, makeUniformLocationAccessor } from './shader-tools'
import vs from './shaders/visualize.vs'
import fs from './shaders/visualize.fs'

export default class VisualizationRenderer {
  private program: WebGLProgram; 
  private uniLocs: any; 

  constructor(
    private gl: WebGL2RenderingContext, 
    private drawScreenQuad: () => void, 
    sqrtBufferSize: number, 
  ) {
    this.program = compileShaders(gl, vs, fs)
    this.uniLocs = makeUniformLocationAccessor(gl, this.program)

    gl.useProgram(this.program)

    gl.uniform1f(this.uniLocs.bufferSize, sqrtBufferSize ** 2) 
    gl.uniform1f(this.uniLocs.sqrtBufferSize, sqrtBufferSize)
    gl.uniform1i(this.uniLocs.samples, 0)
  }

  render (
    sampleTex: WebGLTexture, 
    scanSegment: number[], 
    center: number, 
    normalizeFactor: number
  ) {
    // use texture
    this.gl.activeTexture(this.gl.TEXTURE0)
    this.gl.bindTexture(this.gl.TEXTURE_2D, sampleTex)

    this.gl.disable(this.gl.CULL_FACE)
    this.gl.disable(this.gl.DEPTH_TEST)
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFuncSeparate(
      this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, 
      this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA
    );

    this.gl.useProgram(this.program)
    this.gl.uniform1f(this.uniLocs.periodBegin, scanSegment[0])
    this.gl.uniform1f(this.uniLocs.periodLength, scanSegment[1])

    this.gl.uniform1f(this.uniLocs.center, center)
    this.gl.uniform1f(this.uniLocs.normalizeFactor, normalizeFactor)

    this.drawScreenQuad()
  }
}
