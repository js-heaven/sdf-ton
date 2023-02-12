import './style.css'

import { vec3, mat4 } from 'gl-matrix'

import { compileShaders, makeUniformLocationAccessor } from './utils/shader-tools'

import ARToolkit from 'artoolkit5-js'

import shapeVs from './shaders/shape.vs'
import shapeFs from './shaders/shape.fs'

import cubedShapeVs from './shaders/cubedShape.vs'
import cubedShapeFs from './shaders/cubedShape.fs'

import cubeVs from './shaders/cube.vs'
import cubeFs from './shaders/cube.fs'

import visualizeVs from './shaders/visualize.vs'
import visualizeFs from './shaders/visualize.fs'

import startSampling from './utils/sampling'

import GestureHandler from './utils/gesture-detection';
import Store from './store';
import createSocket from './utils/web-socket';
import { GestureCallbackFn } from './utils/gesture-detection/gesture-detector';
import TapDetector from './utils/gesture-detection/tap';
import PanDetector from './utils/gesture-detection/pan';

// sqrt buffer size has to be dividable by 4 because we're forced to render to RGBA32F
const SQRT_BUFFER_SIZE = 64
const BUFFER_SIZE = SQRT_BUFFER_SIZE ** 2
const NUMBER_OF_BUFFERS = 3

window.addEventListener('load', () => {

  // parse search params

  const appParams = new URLSearchParams(location.search) 
  const noAr = !appParams.has('ar')
  const renderBoxes = appParams.has('render-boxes')
  const visualize = appParams.has('visualize')


  // Prepare AR stuff

  const cam = document.getElementById('camera') as HTMLVideoElement
  let arController: any = undefined
  let cameraMatrix = mat4.create()
  if(noAr) {
    cam.parentNode?.removeChild(cam) 
  } else {
    cam.addEventListener('play', () => {
      console.log(cam.videoWidth, cam.videoHeight)
      ARToolkit.ARController.initWithImage(
        cam, 
        '/camera_para.dat', {
          orientation: 'landscape',
        }
      ).then((controller: any) => { 
        controller.setPatternDetectionMode(artoolkit.AR_MATRIX_CODE_DETECTION);
        controller.setMatrixCodeType(artoolkit.AR_MATRIX_CODE_3x3_HAMMING63);
        // controller.setThresholdMode(artoolkit.AR_LABELING_THRESH_MODE_AUTO_OTSU); 
        arController = controller
        cameraMatrix = mat4.clone(arController.getCameraMatrix())
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
  }

  // Prepare WebGL stuff

  const canvas = document.getElementById("canvas") as HTMLCanvasElement
  const gl = canvas.getContext("webgl2", {
    alpha: true,
   // antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  })
  if(!gl) {
    console.error(`WebGL2 is not supported`)
    return
  }

  const ext = {
    float: gl.getExtension('EXT_color_buffer_float'),
  }
  if(!ext.float) {
    console.error(`EXT_color_buffer_float is not supported`)
    return
  }


  // create State

  const socket = createSocket();
  const store = new Store(socket);


  const drawScreenQuad = makeDrawScreenQuad(gl)
  const drawCube = makeDrawCube(gl)

  const shapeProgram = compileShaders(gl, shapeVs, shapeFs)
  const shapeUniLocs = makeUniformLocationAccessor(gl, shapeProgram)

  let swipeA = [1,0]
  let swipeB = [1,0]

  const setSdfUniforms = (uniLocs: any) => {
    gl.uniform1f(uniLocs.tapState, store.tapState);
    gl.uniform1f(uniLocs.twist, store.twist);
  }

  const renderShape = () => {
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.BLEND)

    gl.useProgram(shapeProgram)

    // time
    gl.uniform1f(shapeUniLocs.time, time)

    // camera
    gl.uniform3fv(shapeUniLocs.camPosition, camPosition)
    gl.uniform3fv(shapeUniLocs.camStraight, camStraight)
    gl.uniform3fv(shapeUniLocs.camRight, camRight)
    gl.uniform3fv(shapeUniLocs.camUp, camUp)
    if(sampleTex) {
      [swipeA, swipeB] = getPlaneSegment()
        .map(angle => [Math.cos(angle), Math.sin(angle)])
    }
    gl.uniform2fv(shapeUniLocs.swipeA, swipeA)
    gl.uniform2fv(shapeUniLocs.swipeB, swipeB)

    setSdfUniforms(shapeUniLocs)

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
    // use texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, sampleTex)

    gl.disable(gl.CULL_FACE)
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFuncSeparate(
      gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, 
      gl.ONE, gl.ONE_MINUS_SRC_ALPHA
    );

    [periodBegin, periodLength] = getPeriodBeginAndLength()

    normalizeInfo = getNormalizeInfo();
    console.log(normalizeInfo); 

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
  const fixedModelMatrix = mat4.create()
  mat4.fromXRotation(fixedModelMatrix, Math.PI / 2)
  mat4.translate(fixedModelMatrix, fixedModelMatrix, [0., 1., 0])
  const modelMatrix = mat4.create()
  const updateModelMatrix = () => {
    mat4.rotateY(modelMatrix, fixedModelMatrix, time * 0.1)
  }
  const modelViewMatrix = mat4.create() 
  const renderCube = (viewMatrix: mat4, color: number[]) => {
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.FRONT)
    gl.disable(gl.BLEND)

    gl.useProgram(cubeProgram)

    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix)
    mat4.mul(mvp, projectionMatrix, modelViewMatrix)

    gl.uniformMatrix4fv(cubeUniLocs.mvp, false, mvp)
    gl.uniform3fv(cubeUniLocs.color, color)

    drawCube()
  }

  const cubedShapeProgram = compileShaders(gl, cubedShapeVs, cubedShapeFs)
  const cubedShapeUniLocs = makeUniformLocationAccessor(gl, cubedShapeProgram)
  const inverseModelViewMatrix = mat4.create()
  const renderCubedShape = (viewMatrix: mat4) => {
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.disable(gl.BLEND)

    gl.useProgram(cubedShapeProgram)

    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix)
    mat4.mul(mvp, projectionMatrix, modelViewMatrix)
    gl.uniformMatrix4fv(cubedShapeUniLocs.mvp, false, mvp)

    const camPosition = vec3.create()
    mat4.invert(inverseModelViewMatrix, modelViewMatrix)
    vec3.transformMat4(camPosition, camPosition, inverseModelViewMatrix)
    gl.uniform3fv(cubedShapeUniLocs.camPosition, camPosition)

    setSdfUniforms(cubedShapeUniLocs)

    drawCube()
  }


  // resize
  let aspectRatio = 1
  let nearPlaneSize = 1
  let screenRatio = 1
  let webcamRatio = 1
  const correction = mat4.create()
  const projectionMatrix = mat4.create()
  mat4.fromZRotation(correction, Math.PI / 2)
  const resolutionFactor = 1 // will be used later < 1 for slow devices
  const resize = () => {
    const pixelRatio = window.devicePixelRatio || 1
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    screenRatio = screenWidth / screenHeight

    let width, height
    let top, left

    if(noAr) {
      width = screenWidth 
      height = screenHeight
      top = 0 
      left = 0
    } else {
      if(arController !== undefined) {
        if(screenRatio < 1) {
          arController.orientation = 'portrait'
          mat4.mul(projectionMatrix, correction, cameraMatrix)
        } else {
          arController.orientation = 'landscape'
          mat4.copy(projectionMatrix, cameraMatrix)
        }
      }

      // reset shape visible
      for(let i = 0; i < numberOfShapes; i++) {
        shapes[i].visible = false
      }

      // resize cam video
      const sourceWidth = cam.videoWidth;
      const sourceHeight = cam.videoHeight;
      webcamRatio = sourceWidth / sourceHeight

      // scale to fill screen
      const scaleScale = 1 // rather for debugging 0.65
      let scale = 1
      if(webcamRatio > screenRatio) {
        scale = screenHeight / sourceHeight * scaleScale
        left = (screenWidth - sourceWidth * scale) / 2
        top = (screenHeight - sourceHeight * scale) / 2
      } else {
        scale = screenWidth / sourceWidth * scaleScale
        top = (screenHeight - sourceHeight * scale) / 2
        left = (screenWidth - sourceWidth * scale) / 2
      }

      width = sourceWidth * scale
      height = sourceHeight * scale

      cam.style.width = width + "px";
      cam.style.height = height + "px";
      cam.style.top = top + "px";
      cam.style.left = left + "px";
    }

    // resize canvas
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.style.top = top + "px";
    canvas.style.left = left + "px";
    canvas.width = Math.round(width * pixelRatio * resolutionFactor) 
    canvas.height = Math.round(height * pixelRatio * resolutionFactor)
    aspectRatio = width / height

    nearPlaneSize = 0.5 / (aspectRatio > 1 ? 1 : aspectRatio)

    gl.useProgram(shapeProgram)

    gl.uniform1f(shapeUniLocs.aspectRatio, aspectRatio)
    gl.uniform1f(shapeUniLocs.nearPlaneSize, nearPlaneSize)

    store.dimensions.width = screenWidth;
    store.dimensions.height = screenHeight;
  }


  // Prepare Audio Webworker for audio sampling

  const {
    sampleTex,
    isReady,
    getPlaneSegment,
    getPeriodBeginAndLength,
    getNormalizeInfo,
  } = startSampling(gl, drawScreenQuad, setSdfUniforms, {
    radius: 5,
    sqrtBufferSize: SQRT_BUFFER_SIZE,
    numberOfBuffers: NUMBER_OF_BUFFERS,
  }) 


  // Camera 

  const lookAt = vec3.fromValues(0, 0, 0)
  const camPosition = vec3.create()
  const camStraight = vec3.create()
  const camRight = vec3.create()
  const camUp = vec3.create()

  const camR = 5

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
    const yScale = Math.sqrt(0.25 / aspectRatio)
    const xScale = yScale * aspectRatio

    vec3.scale(camRight, camRight, xScale)
    vec3.scale(camUp, camUp, yScale)
  }

  
  // AR marker detection 

  class Shape {
    visible = false
    markerTransformMat = new Float64Array(12)
    transformMat = mat4.create()
    glMatrix = mat4.create()
    color: number[]
    fadeOut = 0

    constructor() {
      this.visible = false
      this.markerTransformMat = new Float64Array(12) 
      this.transformMat = mat4.create()
      this.glMatrix = mat4.create()
      this.color = [Math.random(), Math.random(), Math.random()]
    }
  }
  const numberOfShapes = 8
  const shapes: Shape[] = []
  for(let i = 0; i < numberOfShapes; i++) {
    shapes.push(new Shape())
  }
  const updateAR = () => {
    arController.detectMarker();
    const num = arController.getMarkerNum()
    let info, id, shape, transformation
    const visibleShapes = new Set()
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

  resize()
  window.addEventListener('resize', resize )

  let time = 0
  let deltaTime = 0
  let lastDateNow = Date.now()
  let now = 0 

  const loop = () => {

    now = Date.now()
    deltaTime = (now - lastDateNow) / 1000
    lastDateNow = now
    time += deltaTime

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    if(noAr) {
      updateCamera()
      renderShape()
    } else {
      if (arController !== undefined) {
        updateAR()
      } 
      updateModelMatrix()

      if(renderBoxes) {
        for(let i = 0; i < numberOfShapes; i++) {
          if(shapes[i].visible) {
            renderCube(shapes[i].glMatrix, shapes[i].color)
          }
        }
      }

      for(let i = 0; i < numberOfShapes; i++) {
        if(shapes[i].visible) {
          renderCubedShape(shapes[i].glMatrix) 
        }
      }
    }

    if (visualize && isReady()) {
      visualizePass()
    }

    requestAnimationFrame(loop)
  }

  loop()

  const gestureCallbackFn: GestureCallbackFn = (gestureType, args) => {
    console.log('Gesture detected:', gestureType, args);

    if (gestureType === TapDetector.TYPE) store.toggleTapState();
    if (gestureType === PanDetector.TYPE) store.updatePanState(args);
  }

  new GestureHandler(canvas, gestureCallbackFn);
})

function makeDrawScreenQuad(gl: WebGL2RenderingContext) {
  /*
   * ScreenQuad render
   */
  const quadVao = gl.createVertexArray()
  gl.bindVertexArray(quadVao)
  gl.enableVertexAttribArray(0)

  const quadBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  {
    const vertices = [
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
  const cubeVao = gl.createVertexArray()
  gl.bindVertexArray(cubeVao)
  gl.enableVertexAttribArray(0)

  const cubeBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer)
  {
    const vertices = [
      -1,-1,-1, // triangle 1 : begin
      -1,-1, 1,
      -1, 1, 1, // triangle 1 : end
      1, 1,-1, // triangle 2 : begin
      -1,-1,-1,
      -1, 1,-1, // triangle 2 : end
      1,-1, 1,
      -1,-1,-1,
      1,-1,-1,
      1, 1,-1,
      1,-1,-1,
      -1,-1,-1,
      -1,-1,-1,
      -1, 1, 1,
      -1, 1,-1,
      1,-1, 1,
      -1,-1, 1,
      -1,-1,-1,
      -1, 1, 1,
      -1,-1, 1,
      1,-1, 1,
      1, 1, 1,
      1,-1,-1,
      1, 1,-1,
      1,-1,-1,
      1, 1, 1,
      1,-1, 1,
      1, 1, 1,
      1, 1,-1,
      -1, 1,-1,
      1, 1, 1,
      -1, 1,-1,
      -1, 1, 1,
      1, 1, 1,
      -1, 1, 1,
      1,-1, 1
    ]
      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
  }

  return () => {
    gl.bindVertexArray(cubeVao)
    gl.drawArrays(gl.TRIANGLES, 0, 6 * 3 * 2) // 6 faces
  }
}

