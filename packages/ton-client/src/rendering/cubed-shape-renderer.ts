import { mat4, vec3 } from 'gl-matrix'

import { createSdfVariationPrograms, ProgramUniLocsPair } from './create-sdf-variation-programs';
import vs from './shaders/cubedShape.vs'
import fs from './shaders/cubedShape.fs'

export default class CubedShapeRenderer {
  private programUniLocsPairs: ProgramUniLocsPair[] = []

  constructor(
    private gl: WebGL2RenderingContext, 
    private selectProgramAndSetSdfUniforms: (uniLocs: any, shapeId: number) => any, 
    private drawCube: () => void, 
  ) {
    this.programUniLocsPairs = createSdfVariationPrograms(gl, vs, fs)
  }

  render (shapeId: number, mvp: mat4, camPosition: vec3, alpha: number) {
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.enable(this.gl.CULL_FACE)
    this.gl.cullFace(this.gl.BACK)

    this.gl.enable(this.gl.BLEND)
    this.gl.blendFuncSeparate(
      this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA,
      this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA
    )

    const uniLocs = this.setSdfUniforms(this.programUniLocsPairs, shapeId)

    this.gl.uniformMatrix4fv(uniLocs.mvp, false, mvp)

    this.gl.uniform3fv(uniLocs.camPosition, camPosition)

    this.gl.uniform1f(uniLocs.alpha, alpha)


    this.drawCube()
  }
}
