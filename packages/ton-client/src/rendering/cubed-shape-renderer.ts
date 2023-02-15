import { mat4, vec3 } from 'gl-matrix'
import { compileShaders, makeUniformLocationAccessor } from './shader-tools'
import vs from './shaders/cubedShape.vs'
import fs from './shaders/cubedShape.fs'

export default class CubedShapeRenderer {
  private program: WebGLProgram; 
  private uniLocs: any; 

  constructor(
    private gl: WebGL2RenderingContext, 
    private setSdfUniforms: (uniLocs: any) => void,
    private drawCube: () => void, 
  ) {
    this.program = compileShaders(gl, vs, fs)
    this.uniLocs = makeUniformLocationAccessor(gl, this.program)
  }

  render (mvp: mat4, camPosition: vec3, alpha: number) {
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.enable(this.gl.CULL_FACE)
    this.gl.cullFace(this.gl.BACK)

    this.gl.enable(this.gl.BLEND)
    this.gl.blendFuncSeparate(
      this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA,
      this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA
    )

    this.gl.useProgram(this.program)

    this.gl.uniformMatrix4fv(this.uniLocs.mvp, false, mvp)

    this.gl.uniform3fv(this.uniLocs.camPosition, camPosition)

    this.gl.uniform1f(this.uniLocs.alpha, alpha)

    this.setSdfUniforms(this.uniLocs)

    this.drawCube()
  }
}
