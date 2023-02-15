import './style.css'

import { vec3, mat4 } from 'gl-matrix'

import measureDeviceFramerate from './utils/measure-device-framerate'


import GestureHandler from './utils/gesture-detection';
import Store from './store';
import createSocket from './utils/web-socket';
import { GestureCallbackFn } from './utils/gesture-detection/gesture-detector';
import TapDetector from './utils/gesture-detection/tap';
import PanDetector from './utils/gesture-detection/pan';

import { makeDrawScreenQuad, makeDrawCube } from './rendering/geometry-setup'

import ArShapeManager from './ar-shape-manager';

import ShapeRenderer from './rendering/shape-renderer';
import CubeRenderer from './rendering/cube-renderer';
import CubedShapeRenderer from './rendering/cubed-shape-renderer';
import VisualizationRenderer from './rendering/visualization-renderer';

import ShapeSampler from './shape-sampler';

// sqrt buffer size has to be dividable by 4 because we're forced to render to RGBA32F
const SQRT_BUFFER_SIZE = 64
const BUFFER_SIZE = SQRT_BUFFER_SIZE ** 2
const NUMBER_OF_BUFFERS = 3

interface LoopContext {
  closestShape: number | undefined, 
  lastDateNow: number, 
  deltaTime: number, 
  time: number, 
  resize: () => void, 
  shapeRenderer: ShapeRenderer, 
  cubeRenderer: CubeRenderer,
  cubedShapeRenderer: CubedShapeRenderer,
  visualizationRenderer: VisualizationRenderer,
  shapeSampler: ShapeSampler,
}

  const targetFrameDuration = 1 / await measureDeviceFramerate() 
  console.log('targetFrameRate', 1 / targetFrameDuration) 
  let slowFramesSince = 0
  let optimalFramesSince = 0
  const maxRenderTime = Math.min(1 / 24, targetFrameDuration / 0.9) 
  let avgRenderTime = targetFrameDuration

window.addEventListener('load', async () => {
  const modeParams = new URLSearchParams(location.search) 

  const canvas = document.getElementById("canvas") as HTMLCanvasElement
  const gl = setUpWebGL(canvas) 

  const drawScreenQuad = makeDrawScreenQuad(gl)
  const drawCube = makeDrawCube(gl)

  // create State
  const socket = createSocket();
  const store = new Store(socket);

  const setSdfUniforms = (uniLocs: any) => {
    gl.uniform1f(uniLocs.tapState, store.tapState);
    gl.uniform1f(uniLocs.twist, store.twist);
  }

  let resolutionDivisor = 1 
  const resize = () => {
    const pixelRatio = window.devicePixelRatio || 1
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let width = screenWidth 
    let height = screenHeight
    let top = 0 
    let left = 0

    if(arShapeManger) {
      [left, top, width, height] = arShapeManger.resize(screenWidth, screenHeight) 
    }

    // resize canvas
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.style.top = top + "px";
    canvas.style.left = left + "px";
    canvas.width = Math.round(width * pixelRatio / resolutionDivisor) 
    canvas.height = Math.round(height * pixelRatio / resolutionDivisor)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    
    const aspectRatio = width / height

    if(shapeRenderer !== undefined) {
      shapeRenderer.setAspectRatio(aspectRatio) 
    }

    store.dimensions.width = screenWidth;
    store.dimensions.height = screenHeight;
  }

  if(!modeParams.has('no-ar')) { // default to ar 
    const cam = document.getElementById('camera') as HTMLVideoElement
    var arShapeManger = new ArShapeManager(cam, resize)
    var cubedShapeRenderer = new CubedShapeRenderer(gl, setSdfUniforms, drawCube)
    if(modeParams.has('cubes')) {
      var cubeRenderer = new CubeRenderer(gl, drawCube)
    }
  } else if(modeParams.has('render')) {
    var shapeRenderer = new ShapeRenderer(gl, setSdfUniforms, drawScreenQuad)
  }

  if(modeParams.has('audio')) {
    const playButton = document.getElementById('play')!
    playButton.style.display = 'block'
    var shapeSampler = new ShapeSampler(
      gl, drawScreenQuad, setSdfUniforms, 5, 
      SQRT_BUFFER_SIZE, 
      NUMBER_OF_BUFFERS, 
    )
    playButton.addEventListener('click', async () => {
      playButton.style.display = 'none'
      shapeSampler.start()
    })
    if(modeParams.has('visualizer')) {
      var visualizationRenderer = new VisualizationRenderer(gl, setSdfUniforms, drawScreenQuad)
    }
  }

  if(!modeParams.has('no-gestures')) {
    const gestureCallbackFn: GestureCallbackFn = (gestureType, args) => {
      console.log('Gesture detected:', gestureType, args);
      if (gestureType === TapDetector.TYPE) store.toggleTapState();
      if (gestureType === PanDetector.TYPE) store.updatePanState(args);
    }

    var gestureHandler = new GestureHandler(canvas, gestureCallbackFn);
  }

  window.addEventListener('resize', resize )
  resize()

  loop(gl, {
    resize,
    deltaTime: 0, 
    lastDateNow: Date.now(), 
    time: 0,



  })
})


function loop(gl: WebGL2RenderingContext, lc: LoopContext) {
  const now = Date.now()
  lc.deltaTime = (now - lc.lastDateNow) * 0.001
  lc.lastDateNow = now
  lc.time += lc.deltaTime

  const beforeRender = Date.now()

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  // for rendering the scan - maybe make it a function of sampling
  if(lc.shapeSampler) {
    if(lc.visualizationRenderer) {
      let swipeA = [1,0]
      let swipeB = [1,0]
      let sampleTexture = lc.shapeSampler.getSampleTexture()

      if(sampleTexture) {

        [swipeA, swipeB] = lc.shapeSampler.getPlaneSegment()
          .map(angle => [Math.cos(angle), Math.sin(angle)])
        lc.visualizationRenderer.render(
          sampleTexture,
          lc.shapeSampler.getPlaneSegment(), 
          lc.shapeSampler.getNormalizeInfo()
        )
      }

  if(noAr) {
    updateCamera()
    renderShape()
  } else {
    if (arController !== undefined) {
      updateAR()
    } 
    updateModelMatrix()


    if(renderBoxes) {
      sortedShapes.forEach(shape => {
        if(shape.visible) {
          renderCube(shape.glMatrix, shape.color)
        }
      })
    }

    const fadeTime = 0.3
    sortedShapes.forEach(shape => {
      let alpha = 0
      if(shape.visible) {
        alpha = 1 - shape.fadeIn / fadeTime
      } else {
        alpha = shape.fadeOut / fadeTime
      }
      if(alpha) {
        renderCubedShape(shape, alpha)
      }Shopping
    })
  }

  if (visualize && isReady()) {

    [periodBegin, periodLength] = getPeriodBeginAndLength()

    normalizeInfo = getNormalizeInfo();

    visualizePass()
  }

  gl.finish()

  const afterRender = Date.now()
  const renderTime = (afterRender - beforeRender) * 0.001

  if(renderTime > maxRenderTime) {
    slowFramesSince += renderTime
  } else {
    slowFramesSince = 0
  }

  if(slowFramesSince > 0.5) { // if slow frames for more than one second
    resolutionDivisor += 1
    resize()
    slowFramesSince = -0.5 // wait 2 seconds before reevaluation
  }

  if(resolutionDivisor > 1) {
    avgRenderTime = (99 * avgRenderTime + renderTime) * 0.01

    // workload factor expresses how much more pixel a shift up in resolutionDivisor would mean
    const workloadFactor = Math.pow(resolutionDivisor / (resolutionDivisor - 1), 2) 

    if(avgRenderTime < targetFrameDuration * (0.3 + 1 / workloadFactor)) {
      console.log('stepping up') 
      resolutionDivisor -= 1
      optimalFramesSince = -1
      resize()
    }
  }
  requestAnimationFrame(() => {
    loop(gl, lc)
  })
}


function setUpWebGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
  // antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  })
  if(!gl) {
    throw new Error(`WebGL2 is not supported`)
  }

  const ext = {
    float: gl.getExtension('EXT_color_buffer_float'),
  }
  if(!ext.float) {
    throw new Error(`EXT_color_buffer_float is not supported`)
  }
  return gl
}
