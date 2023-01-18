import './style.css'

import { vec3, mat4 } from 'gl-matrix'

import { compileShaders, makeUniformLocationAccessor } from './shader-tools'

import renderVs from './shaders/render.vs'
import renderFs from './shaders/render.fs'
import sampleVs from './shaders/sample.vs'
import sampleFs from './shaders/sample.fs'

window.addEventListener('load', () => {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement
  const gl = canvas.getContext("webgl2", {
    // alpha: true,
    // depth: true,
    // antialias: false,
    // premultipliedAlpha: false,
    // preserveDrawingBuffer: true
  })
  if(!gl) {
    console.error(`WebGL2 is not supported`)
    return
  }

  const drawScreenQuad = makeDrawScreenQuad(gl)

  const renderProgram = compileShaders(gl, renderVs, renderFs)
  const renderUniLocs = makeUniformLocationAccessor(gl, renderProgram)

  const renderPass = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height) 

    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)

    gl.useProgram(renderProgram)

    // time
    gl.uniform1f(renderUniLocs.time, time)

    // camera
    gl.uniform3fv(renderUniLocs.camPosition, camPosition)
    gl.uniform3fv(renderUniLocs.camStraight, camStraight)
    gl.uniform3fv(renderUniLocs.camRight, camRight)
    gl.uniform3fv(renderUniLocs.camUp, camUp)

    drawScreenQuad()
  }

  // resize
  let aspectRatio = 1
  let nearPlaneSize = 1
  const resize = () => {
    let pixelRatio = window.devicePixelRatio || 1
    canvas.width = Math.round(canvas.clientWidth * pixelRatio)
    canvas.height = Math.round(canvas.clientHeight * pixelRatio)
    aspectRatio = canvas.width / canvas.height

    nearPlaneSize = 0.5 / (aspectRatio > 1 ? 1 : aspectRatio)

    gl.useProgram(renderProgram)

    gl.uniform1f(renderUniLocs.aspectRatio, aspectRatio)
    gl.uniform1f(renderUniLocs.nearPlaneSize, nearPlaneSize)
  }

  resize()
  window.addEventListener('resize', resize )

  let lookAt = vec3.fromValues(0, 0, 0)
  let camPosition = vec3.create()
  let camStraight = vec3.create()
  let camRight = vec3.create()
  let camUp = vec3.create()

  let camR = 5

  const updateCamera = () => {
    vec3.set(camUp, 0, 1, 0)

    vec3.set(camPosition,
      camR * Math.cos(time * 0.1), 
      2.5,
      camR * Math.sin(time * 0.1),
    )
    vec3.sub(camStraight, lookAt, camPosition)
    vec3.normalize(camStraight, camStraight)
    vec3.cross(camRight, camUp, camStraight)

    // I)  2*x * 2*y = 1
    // x * y = 1 / 4
    // II) x = y * aspectRatio
    // II in I) y * y * aspectRatio = 1 / 4
    // y = sqrt(1 / 4 / aspectRatio)

    let yScale = Math.sqrt(0.25 / aspectRatio)
    let xScale = yScale * aspectRatio

    vec3.scale(camRight, camRight, xScale)
    vec3.scale(camUp, camUp, yScale)
  }

  let time = 0
  let deltaTime = 0
  let lastDateNow = Date.now()

  const loop = () => {
    let now = Date.now()
    deltaTime = (now - lastDateNow) / 1000
    lastDateNow = now
    time += deltaTime

    updateCamera()

    renderPass()

    requestAnimationFrame(loop) 
  }

  loop()
})

function makeDrawScreenQuad(gl: WebGL2RenderingContext) {
  /*
   * ScreenQuad render
   */
  let quadVao = gl.createVertexArray()
  gl.bindVertexArray(quadVao)
  gl.enableVertexAttribArray(0)

  let quadBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  {
    let vertices = [
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  }

  return () => {
    gl.bindVertexArray(quadVao)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}
