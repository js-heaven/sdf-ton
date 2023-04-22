import { mat4 } from 'gl-matrix'
import { compileShaders, makeUniformLocationAccessor } from './shader-tools'
import vs from './shaders/cube.vs'
import fs from './shaders/cube.fs'

export default class CubeRenderer {
  private program: WebGLProgram; 
  private uniLocs: any; 

  constructor(
    private gl: WebGL2RenderingContext, 
    private drawCube: () => void, 
  ) {
    this.program = compileShaders(gl, vs, fs)
    this.uniLocs = makeUniformLocationAccessor(gl, this.program)
  }

  render(mvp: mat4) {
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.enable(this.gl.CULL_FACE)
    this.gl.cullFace(this.gl.FRONT)
    this.gl.disable(this.gl.BLEND)

    this.gl.useProgram(this.program)

    this.gl.uniformMatrix4fv(this.uniLocs.mvp, false, mvp)

    this.drawCube()
  }
}
