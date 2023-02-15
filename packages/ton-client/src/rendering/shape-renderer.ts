import { vec3 } from 'gl-matrix'
import { compileShaders, makeUniformLocationAccessor } from './shader-tools'
import vs from './shaders/shape.vs'
import fs from './shaders/shape.fs'

export default class ShapeRenderer {
  private program: WebGLProgram; 
  private uniLocs: any; 

  private lookAt: vec3
  private camPosition: vec3
  private camStraight: vec3
  private camRight: vec3
  private camUp: vec3
  private camR: number

  private viewPlaneHalfWidth = 1
  private viewPlaneHalfHeight = 1

  constructor(
    private gl: WebGL2RenderingContext, 
    private setSdfUniforms: (uniLocs: any) => void,
    private drawScreenQuad: () => void, 
  ) {
    this.program = compileShaders(gl, vs, fs)
    this.uniLocs = makeUniformLocationAccessor(gl, this.program)

    this.lookAt = vec3.fromValues(0, 0, 0)

    this.camPosition = vec3.create()
    this.camStraight = vec3.create()
    this.camRight = vec3.create()
    this.camUp = vec3.create()

    this.camR = 5
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

    this.gl.useProgram(this.program)
    this.gl.uniform1f(this.uniLocs.aspectRatio, aspectRatio)

    const nearPlaneSize = 0.5 / (aspectRatio > 1 ? 1 : aspectRatio)
    this.gl.uniform1f(this.uniLocs.nearPlaneSize, nearPlaneSize) 

  }

  render(time: number, planeSegment: number[][]) {
    this.updateCamera(time) 

    this.gl.disable(this.gl.DEPTH_TEST)
    this.gl.disable(this.gl.CULL_FACE)
    this.gl.disable(this.gl.BLEND)

    this.gl.useProgram(this.program)

    // time
    this.gl.uniform1f(this.uniLocs.time, time)

    // camera
    this.gl.uniform3fv(this.uniLocs.camPosition, this.camPosition)
    this.gl.uniform3fv(this.uniLocs.camStraight, this.camStraight)
    this.gl.uniform3fv(this.uniLocs.camRight, this.camRight)
    this.gl.uniform3fv(this.uniLocs.camUp, this.camUp)

    this.gl.uniform2fv(this.uniLocs.swipeA, planeSegment[0])
    this.gl.uniform2fv(this.uniLocs.swipeB, planeSegment[1])

    this.setSdfUniforms(this.uniLocs)

    this.drawScreenQuad()
  }

  updateCamera(time: number) {
    vec3.set(this.camPosition,
      this.camR * Math.cos(time * 0.5),
      Math.sin(time * 0.33) * 2.5,
      this.camR * Math.sin(time * 0.5),
    )

    vec3.sub(this.camStraight, this.lookAt, this.camPosition)
    vec3.normalize(this.camStraight, this.camStraight)

    vec3.set(this.camUp, 0, 1, 0) // has to be reset everytime because we scale it based on aspectRatio
    vec3.cross(this.camRight, this.camUp, this.camStraight)

    vec3.scale(this.camRight, this.camRight, this.viewPlaneHalfWidth)
    vec3.scale(this.camUp, this.camUp, this.viewPlaneHalfHeight)
  }
}
