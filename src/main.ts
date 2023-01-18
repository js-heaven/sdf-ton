import './style.css'

import { mat4 } from 'gl-matrix'

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

  let viewMatrix = mat4.create()
  mat4.identity(viewMatrix)

  const renderPass = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height) 

    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)

    gl.useProgram(renderProgram)

    gl.uniformMatrix4fv(renderUniLocs.viewMatrix, true, viewMatrix)

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

  const loop = () => {
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
