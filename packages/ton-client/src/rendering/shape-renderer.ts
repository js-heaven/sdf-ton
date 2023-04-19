import { createSdfVariationPrograms, ProgramUniLocsPair } from './create-sdf-variation-programs';

import { vec3 } from 'gl-matrix'

import vs from './shaders/shape.vs'
import fs from './shaders/shape.fs'

export default class ShapeRenderer {
  private programUniLocsPairs: ProgramUniLocsPair[] = []

  private lookAt: vec3
  private camPosition: vec3
  private camStraight: vec3
  private camRight: vec3
  private camUp: vec3

  private viewPlaneHalfWidth = 1
  private viewPlaneHalfHeight = 1

  constructor(
    private gl: WebGL2RenderingContext, 
    private selectProgramAndSetSdfUniforms: (uniLocs: any, shapeId: number) => any,
    private drawScreenQuad: () => void, 
    private camRadius: number
  ) {
    this.programUniLocsPairs = createSdfVariationPrograms(gl, vs, fs)

    this.lookAt = vec3.fromValues(0, 0, 0)

    this.camPosition = vec3.create()
    this.camStraight = vec3.create()
    this.camRight = vec3.create()
    this.camUp = vec3.create()

  }

  setAspectRatio(aspectRatio: number) {
    // surface of near plane has to be 1
    // I)  2*x * 2*y = 1
    // x * y = 1 / 4
    // II) x = y * aspectRatio
    // II in I) y * y * aspectRatio = 1 / 4
    // y = sqrt(1 / 4 / aspectRatio)

    this.viewPlaneHalfHeight = Math.sqrt(0.25 / aspectRatio)
    this.viewPlaneHalfWidth = this.viewPlaneHalfHeight * aspectRatio

    this.programUniLocsPairs.forEach(pair => {
      this.gl.useProgram(pair.program)
      this.gl.uniform1f(pair.uniLocs.aspectRatio, aspectRatio)

      const nearPlaneSize = 0.5 / (aspectRatio > 1 ? 1 : aspectRatio)
      this.gl.uniform1f(pair.uniLocs.nearPlaneSize, nearPlaneSize) 
    })
  }

  render(shapeId: number, time: number, planeSegment: number[][]) {
    this.updateCamera(time) 

    this.gl.disable(this.gl.DEPTH_TEST)
    this.gl.disable(this.gl.CULL_FACE)
    this.gl.disable(this.gl.BLEND)

    const uniLocs = this.selectProgramAndSetSdfUniforms(this.programUniLocsPairs, shapeId)

    // time
    this.gl.uniform1f(uniLocs.time, time)

    // camera
    this.gl.uniform3fv(uniLocs.camPosition, this.camPosition)
    this.gl.uniform3fv(uniLocs.camStraight, this.camStraight)
    this.gl.uniform3fv(uniLocs.camRight, this.camRight)
    this.gl.uniform3fv(uniLocs.camUp, this.camUp)

    this.gl.uniform2fv(uniLocs.swipeA, planeSegment[0])
    this.gl.uniform2fv(uniLocs.swipeB, planeSegment[1])

    this.drawScreenQuad()
  }

  updateCamera(time: number) {
    vec3.set(this.camPosition,
      this.camRadius * Math.cos(time * 0.5),
      Math.sin(time * 0.33) * 2.5,
      this.camRadius * Math.sin(time * 0.5),
    )

    vec3.sub(this.camStraight, this.lookAt, this.camPosition)
    vec3.normalize(this.camStraight, this.camStraight)

    vec3.set(this.camUp, 0, 1, 0) // has to be reset everytime because we scale it based on aspectRatio
    vec3.cross(this.camRight, this.camUp, this.camStraight)

    vec3.scale(this.camRight, this.camRight, this.viewPlaneHalfWidth)
    vec3.scale(this.camUp, this.camUp, this.viewPlaneHalfHeight)
  }
}
