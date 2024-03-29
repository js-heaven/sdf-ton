import { mat4, mat3, vec3 } from 'gl-matrix'

import { createSdfVariationPrograms, ProgramUniLocsPair } from './create-sdf-variation-programs';
import loadTexture from './load-texture';

import vs from './shaders/cubedShape.vs'
import fs from './shaders/cubedShape.fs'

export default class CubedShapeRenderer {
  private programUniLocsPairs: ProgramUniLocsPair[] = []

  private envFrontTex: WebGLTexture
  private envBackTex: WebGLTexture

  private inverseModelMatrix3 = mat3.create()

  constructor(
    private gl: WebGL2RenderingContext, 
    private selectProgramAndSetSdfUniforms: (uniLocs: any, shapeId: number) => any, 
    private drawCube: () => void, 
  ) {
    this.programUniLocsPairs = createSdfVariationPrograms(gl, vs, fs)

    this.programUniLocsPairs.forEach((programUniLocsPair) => {
      gl.useProgram(programUniLocsPair.program)
      gl.uniform1i(programUniLocsPair.uniLocs.envFront, 0)
      gl.uniform1i(programUniLocsPair.uniLocs.envBack, 1)
    })

    this.envFrontTex = loadTexture(gl, './env-front.1024.jpg')!
    this.envBackTex = loadTexture(gl, './env-back.1024.jpg')!
  }

  render (
    shapeId: number, 
    mvp: mat4, 
    camPosition: vec3, 
    alpha: number, 
    color: number[], 
    inverseModelMatrix: mat4, 
  ) {
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.enable(this.gl.CULL_FACE)
    this.gl.cullFace(this.gl.BACK)

    this.gl.enable(this.gl.BLEND)
    this.gl.blendFuncSeparate(
      this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA,
      this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA
    )

    this.gl.activeTexture(this.gl.TEXTURE0)
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.envFrontTex)

    this.gl.activeTexture(this.gl.TEXTURE1)
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.envBackTex)

    const uniLocs = this.selectProgramAndSetSdfUniforms(this.programUniLocsPairs, shapeId)

    this.gl.uniformMatrix4fv(uniLocs.mvp, false, mvp)

    this.gl.uniform3fv(uniLocs.camPosition, camPosition)

    this.gl.uniform1f(uniLocs.alpha, alpha)

    this.gl.uniform3fv(uniLocs.shapeColor, color)

    mat3.fromMat4(this.inverseModelMatrix3, inverseModelMatrix)
    this.gl.uniformMatrix3fv(uniLocs.inverseModelMatrix, false, this.inverseModelMatrix3)

    this.drawCube()
  }
}
