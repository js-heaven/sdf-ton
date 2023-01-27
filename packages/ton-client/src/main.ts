import './style.css'
import './utils/web-socket'

import { vec3 } from 'gl-matrix'

import { compileShaders, makeUniformLocationAccessor } from './utils/shader-tools'

import renderVs from './shaders/render.vs'
import renderFs from './shaders/render.fs'

import visualizeVs from './shaders/visualize.vs'
import visualizeFs from './shaders/visualize.fs'

import startSampling from './utils/sampling'

import GestureHandler, { GestureCallbackFn } from './utils/gestures';
import Store from './store'
import { GESTURE_TYPES } from './utils/gesture'

// sqrt buffer size has to be dividable by 4 because we're forced to render to RGBA32F
const SQRT_BUFFER_SIZE = 64
const BUFFER_SIZE = SQRT_BUFFER_SIZE ** 2
const NUMBER_OF_BUFFERS = 3

window.addEventListener('load', () => {
  // Prepare WebGL stuff
  const canvas = document.getElementById("canvas") as HTMLCanvasElement
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    // depth: true,
    // antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true
  })
  if(!gl) {
    console.error(`WebGL2 is not supported`)
    return
  }
  // require extensions
  const ext = {
    float: gl.getExtension('EXT_color_buffer_float'),
  }
  if(!ext.float) {
    console.error(`EXT_color_buffer_float is not supported`)
    return
  }

  // create State
  const store = new Store();

  // Prepare Audio Webworker

  const drawScreenQuad = makeDrawScreenQuad(gl)

  const renderProgram = compileShaders(gl, renderVs, renderFs)
  const renderUniLocs = makeUniformLocationAccessor(gl, renderProgram)

  let swipeA = [1,0]
  let swipeB = [1,0]

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
    if(sampleTex) {
      [swipeA, swipeB] = getPlaneSegment()
        .map(angle => [Math.cos(angle), Math.sin(angle)])
    }
    gl.uniform2fv(renderUniLocs.swipeA, swipeA)
    gl.uniform2fv(renderUniLocs.swipeB, swipeB)

    gl.uniform3fv(renderUniLocs.touchManipulationState, store.state);

    drawScreenQuad()
  }

  const visualizeProgram = compileShaders(gl, visualizeVs, visualizeFs)
  const visualizeUniLocs = makeUniformLocationAccessor(gl, visualizeProgram)

  gl.useProgram(visualizeProgram)

  gl.uniform1f(visualizeUniLocs.bufferSize, BUFFER_SIZE)
  gl.uniform1f(visualizeUniLocs.sqrtBufferSize, SQRT_BUFFER_SIZE)
  gl.uniform1i(visualizeUniLocs.samples, 0)

  let periodBegin = 0
  let periodLength = 0
  let normalizeInfo = {
    center: 1,
    normalizeFactor: 1
  }
  const visualizePass = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)

    // use texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, sampleTex)

    gl.enable(gl.BLEND)
    gl.blendFuncSeparate(
      gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE, gl.ONE_MINUS_SRC_ALPHA
    );

    [periodBegin, periodLength] = getPeriodBeginAndLength();

    normalizeInfo = getNormalizeInfo();

    gl.useProgram(visualizeProgram)
    gl.uniform1f(visualizeUniLocs.periodBegin, periodBegin)
    gl.uniform1f(visualizeUniLocs.periodLength, periodLength)

    gl.uniform1f(visualizeUniLocs.center, normalizeInfo.center)
    gl.uniform1f(visualizeUniLocs.normalizeFactor, normalizeInfo.normalizeFactor)

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

  // start sampling
  let {
    sampleTex,
    isReady,
    getPlaneSegment,
    getPeriodBeginAndLength,
    getNormalizeInfo,
  } = startSampling(gl, drawScreenQuad, {
    radius: 5,
    sqrtBufferSize: SQRT_BUFFER_SIZE,
    numberOfBuffers: NUMBER_OF_BUFFERS,
    touchManipulationState: store.state
  })

  let lookAt = vec3.fromValues(0, 0, 0)
  let camPosition = vec3.create()
  let camStraight = vec3.create()
  let camRight = vec3.create()
  let camUp = vec3.create()

  let camR = 5

  const updateCamera = () => {

    vec3.set(camPosition,
      camR * Math.cos(time * 0.5),
      Math.sin(time * 0.33) * 2.5,
      camR * Math.sin(time * 0.5),
    )

    vec3.sub(camStraight, lookAt, camPosition)
    vec3.normalize(camStraight, camStraight)

    vec3.set(camUp, 0, 1, 0) // has to be reset everytime because we scale it based on aspectRatio
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
    if (isReady()) {
      visualizePass()
    }

    requestAnimationFrame(loop)
  }

  loop()

  const gestureCallbackFn: GestureCallbackFn = (gestureType, args) => {
    console.log('Gesture detected:', gestureType, args);

    if (gestureType === GESTURE_TYPES.tap) store.toggleTapState();
  }

  new GestureHandler(canvas, gestureCallbackFn);
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

