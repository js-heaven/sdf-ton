import './style.css'
// import './utils/web-socket'

import { vec3, mat4 } from 'gl-matrix'

import { compileShaders, makeUniformLocationAccessor } from './utils/shader-tools'

import ARToolkit from 'artoolkit5-js'

import renderVs from './shaders/render.vs'
import renderFs from './shaders/render.fs'

import cubeVs from './shaders/cube.vs'
import cubeFs from './shaders/cube.fs'

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
  const cam = document.getElementById('camera') as HTMLVideoElement
  let arController: any = undefined

  let cameraMatrix: mat4 | undefined 
  cam.addEventListener('play', () => {
    ARToolkit.ARController.initWithImage(cam, '/camera_para.dat').then((controller: any) => { 
      controller.setPatternDetectionMode(artoolkit.AR_MATRIX_CODE_DETECTION);
      controller.setMatrixCodeType(artoolkit.AR_MATRIX_CODE_3x3_HAMMING63);
      arController = controller
      let cameraMatrixF64 = arController.getCameraMatrix()
      cameraMatrix = mat4.clone(cameraMatrixF64)
      resize()
    });
  });

  navigator.mediaDevices.getUserMedia({
    video: { 
      facingMode: "environment", 
    }
  }) 
    .then(function(stream) {
      cam.srcObject = stream
    })
    .catch(function(err) {
      console.log("Error when using camera: " + err);
    });

  const canvas = document.getElementById("canvas") as HTMLCanvasElement
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    // depth: true,
    // antialias: false,
    premultipliedAlpha: false,
    // preserveDrawingBuffer: true
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
  const drawCube = makeDrawCube(gl)

  const renderProgram = compileShaders(gl, renderVs, renderFs)
  const renderUniLocs = makeUniformLocationAccessor(gl, renderProgram)

  let swipeA = [1,0]
  let swipeB = [1,0]

  const renderShape = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)

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

  const cubeProgram = compileShaders(gl, cubeVs, cubeFs)
  const cubeUniLocs = makeUniformLocationAccessor(gl, cubeProgram)
  const mvp = mat4.create()
  const modelMatrix = mat4.create()
  mat4.fromTranslation(modelMatrix, [0., 0., 0.5])
  mat4.scale(modelMatrix, modelMatrix, [0.5, 0.5, 0.5])
  const modelViewMatrix = mat4.create() 
  const renderCube = (viewMatrix: mat4, color: number[]) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)

    gl.enable(gl.BLEND)
    gl.blendFuncSeparate(
      gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE, gl.ONE_MINUS_SRC_ALPHA
    );

    gl.useProgram(cubeProgram)
    gl.disable(gl.CULL_FACE)

    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix)
    mat4.mul(mvp, cameraMatrix!, modelViewMatrix)

    gl.uniformMatrix4fv(cubeUniLocs.mvp, false, mvp)
    gl.uniform3fv(cubeUniLocs.color, color)

    drawCube()
  }


  // resize
  let aspectRatio = 1
  let nearPlaneSize = 1
  let screenRatio = 1
  let webcamRatio = 1
  const resize = () => {
    let pixelRatio = window.devicePixelRatio || 1
    let screenWidth = window.innerWidth;
    let screenHeight = window.innerHeight;
    screenRatio = screenWidth / screenHeight

    // resize cam video
    let sourceWidth = cam.videoWidth;
    let sourceHeight = cam.videoHeight;
    webcamRatio = sourceWidth / sourceHeight

    // scale to fill screen
    const scaleScale = 1
    let scale = 1
    let left = 0
    let top = 0
    if(webcamRatio > screenRatio) {
      scale = screenHeight / sourceHeight * scaleScale
      left = (screenWidth - sourceWidth * scale) / 2
      top = (screenHeight - sourceHeight * scale) / 2
    } else {
      scale = screenWidth / sourceWidth * scaleScale
      top = (screenHeight - sourceHeight * scale) / 2
      left = (screenWidth - sourceWidth * scale) / 2
    }

    let width = sourceWidth * scale
    let height = sourceHeight * scale

    cam.style.width = width + "px";
    cam.style.height = height + "px";
    cam.style.top = top + "px";
    cam.style.left = left + "px";

    // resize canvas
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.style.top = top + "px";
    canvas.style.left = left + "px";
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
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

  let identity = mat4.create()
  mat4.identity(identity) 
  class Shape {
    visible: boolean
    markerTransformMat: Float64Array
    transformMat: mat4
    glMatrix: mat4 
    color: [number, number, number]
    constructor() {
      this.visible = false
      this.markerTransformMat = new Float64Array(12) 
      this.transformMat = mat4.create()
      this.glMatrix = mat4.create()
      this.color = [Math.random(), Math.random(), Math.random()].map(c => 0.5 * c)
    }
  }
  let numberOfShapes = 8
  let shapes: Shape[] = []
  // initialize shapes
  for(let i = 0; i < numberOfShapes; i++) {
    shapes.push(new Shape())
  }
  const updateAR = () => {
    arController.detectMarker();
    let num = arController.getMarkerNum()
    let info, id, shape, transformation
    let visibleShapes = new Set()
    for(let i = 0; i < num; i++) {
      info = arController.getMarker(i)
      id = info.idMatrix
      if(id != -1) {
        visibleShapes.add(id)
        shape = shapes[id]
        transformation = shape.markerTransformMat
        const width = 1
        if(shape.visible) { 
          arController.getTransMatSquareCont(i, width, transformation, transformation)
        } else {
          arController.getTransMatSquare(i, width, transformation) 
        }
        arController.transMatToGLMat(transformation, shape.transformMat) 
        arController.arglCameraViewRHf(shape.transformMat, shape.glMatrix) 
      }     
    }
    for(let i = 0; i < numberOfShapes; i++) {
      if(visibleShapes.has(i)) {
        shapes[i].visible = true; 
      } else {
        shapes[i].visible = false
      }
    }
  }

  let time = 0
  let deltaTime = 0
  let lastDateNow = Date.now()

  const loop = () => {
    if (arController !== undefined) {
      updateAR()
    }

    let now = Date.now()
    deltaTime = (now - lastDateNow) / 1000
    lastDateNow = now
    time += deltaTime

    updateCamera()

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // renderShape()

    // let modelView = mat4.create()
    // mat4.lookAt(modelView, [0, 0, -40], [0, 0, 0], [0, 1, 0])
    // let rotation = mat4.create()
    // mat4.fromRotation(rotation, time, [0,1,0])
    // mat4.mul(modelView, modelView, rotation)
    // renderCube(modelView)

    for(let i = 0; i < numberOfShapes; i++) {
      if(shapes[i].visible) {
        renderCube(shapes[i].glMatrix, shapes[i].color)
      }
    }

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

function makeDrawCube(gl: WebGL2RenderingContext) {
  /*
   * ScreenQuad render
   */
  let cubeVao = gl.createVertexArray()
  gl.bindVertexArray(cubeVao)
  gl.enableVertexAttribArray(0)

  let cubeBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer)
  {
    let vertices = [
       +1,+1,+1, 
       +1,+1,-1, 
       +1,-1,+1, 
       +1,-1,+1, 
       +1,+1,-1, 
       +1,-1,-1, 

       +1,+1,+1, 
       -1,+1,+1, 
       +1,+1,-1, 
       +1,+1,-1, 
       -1,+1,+1, 
       -1,+1,-1, 

       +1,+1,+1, 
       -1,+1,+1, 
       +1,-1,+1, 
       +1,-1,+1, 
       -1,+1,+1, 
       -1,-1,+1, 

       +1,+1,+1, 
       +1,+1,+1, 
       +1,+1,+1, 
       +1,+1,+1, 
       +1,+1,+1, 
       +1,+1,+1, 

       -1,-1,-1, 
       +1,-1,-1, 
       -1,-1,+1, 
       -1,-1,+1, 
       +1,-1,-1, 
       +1,-1,+1, 

       -1,-1,-1, 
       +1,-1,-1, 
       -1,+1,-1, 
       -1,+1,-1, 
       +1,-1,-1, 
       +1,+1,-1, 
    ]
      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
  }

  return () => {
    gl.bindVertexArray(cubeVao)
    gl.drawArrays(gl.TRIANGLES, 0, 6 * 3 * 2) // 6 faces
  }
}

