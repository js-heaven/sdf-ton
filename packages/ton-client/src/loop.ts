import './style.css'

import { Socket } from 'socket.io-client';

import GestureHandler, { GestureCallbackFn } from './utils/gesture-detection';
import Store from './store';
import createSocket from './utils/web-socket';
import PanDetector from './utils/gesture-detection/pan-detector';

import { makeDrawScreenQuad, makeDrawCube } from './rendering/geometry-setup'

import ArShapeManager from './ar-shape-manager';

import ShapeRenderer from './rendering/shape-renderer';
import CubeRenderer from './rendering/cube-renderer';
import CubedShapeRenderer from './rendering/cubed-shape-renderer';
import VisualizationRenderer from './rendering/visualization-renderer';

import ShapeSampler from './shape-sampler';
import { ProgramUniLocsPair, SDF_VARIANTS } from './rendering/create-sdf-variation-programs';
import SwipeDetector from './utils/gesture-detection/swipe-detector';

// sqrt buffer size has to be dividable by 4 because we're forced to render to RGBA32F | maybe we can 4x multisample dither
const SQRT_BUFFER_SIZE = 64
const NUMBER_OF_BUFFERS = 3

const NUMBER_OF_SHAPES = 8

const CAM_RADIUS = 2.5

export default class Loop {

  lastDateNow = Date.now()
  deltaTime = 0
  time = 0

  shapeRenderer: ShapeRenderer | undefined
  cubeRenderer: CubeRenderer | undefined
  cubedShapeRenderer: CubedShapeRenderer | undefined
  visualizationRenderer: VisualizationRenderer | undefined
  shapeSampler: ShapeSampler | undefined

  arShapeManager: ArShapeManager | undefined

  maxRenderTime: number
  avgRenderTime = 0
  
  resolutionDivisor = 1

  canvas: HTMLCanvasElement
  gl: WebGL2RenderingContext

  fps: HTMLDivElement | undefined

  drawScreenQuad: () => void
  drawCube: () => void

  socket: Socket
  store: Store

  gestureHandler: GestureHandler | undefined

  targetShapeId = 0

  lastLoopCall: number | undefined

  constructor() {
    const modeParams = new URLSearchParams(location.search) 

    this.maxRenderTime = 1/24 // minimum 24 fps

    this.canvas = document.getElementById("canvas") as HTMLCanvasElement
    this.gl = this.setUpWebGL(this.canvas) 

    this.drawScreenQuad = makeDrawScreenQuad(this.gl)
    this.drawCube = makeDrawCube(this.gl)

    // create State
    this.socket = createSocket();
    this.store = new Store(
      this.socket, 
      NUMBER_OF_SHAPES,
      SDF_VARIANTS
    );

    if(modeParams.has('fps')) {
      this.fps = document.getElementById('fps') as HTMLDivElement
      this.fps.style.display = 'block'
    }

    if(!modeParams.has('no-ar')) { // default to ar 
      const cam = document.getElementById('camera') as HTMLVideoElement
      this.arShapeManager = new ArShapeManager(cam, NUMBER_OF_SHAPES, this.resize.bind(this))
      this.cubedShapeRenderer = new CubedShapeRenderer(this.gl, this.selectProgramAndSetSdfUniforms.bind(this), this.drawCube)
      if(modeParams.has('cubes')) {
        this.cubeRenderer = new CubeRenderer(this.gl, this.drawCube)
      }
    } else if(modeParams.has('render')) {
      this.shapeRenderer = new ShapeRenderer(
        this.gl, 
        this.selectProgramAndSetSdfUniforms.bind(this), 
        this.drawScreenQuad, 
        CAM_RADIUS
      )
    }

    this.targetShapeId = parseInt(modeParams.get('shape') || '') || 0

    if(modeParams.has('audio')) {
      const playButton = document.getElementById('play') as HTMLDivElement
      playButton.style.display = 'block'
      this.shapeSampler = new ShapeSampler(
        this.gl, 
        this.drawScreenQuad, 
        this.selectProgramAndSetSdfUniforms.bind(this), 
        CAM_RADIUS, 
        SQRT_BUFFER_SIZE, 
        NUMBER_OF_BUFFERS, 
        (shapeId: number) => this.store.getFrequency(shapeId),
        this.targetShapeId
      )
      playButton.addEventListener('click', async () => {
        playButton.style.display = 'none'
        this.shapeSampler!.start()
      })
      if(modeParams.has('visualize')) {
        this.visualizationRenderer = new VisualizationRenderer(this.gl, this.drawScreenQuad, SQRT_BUFFER_SIZE)
      }
    }

    if(!modeParams.has('no-gestures')) {
      const gestureCallbackFn: GestureCallbackFn = (gestureType, args) => {
        // console.log('Gesture detected:', gestureType, args);

        let targetShapeId: number | undefined = this.targetShapeId 
        if(this.arShapeManager) {
          targetShapeId = this.arShapeManager.closestShape?.id
        }
        if(targetShapeId !== undefined) {
          if (gestureType === PanDetector.TYPE) this.store.updatePanState(targetShapeId, args);
          if (gestureType === SwipeDetector.TYPE) this.store.updateSwipeState(targetShapeId, args);
        } 
      }

      this.gestureHandler = new GestureHandler(this.canvas, gestureCallbackFn);
    }
  }

  start() {
    window.addEventListener('resize', this.resize.bind(this))
    this.resize()

    this.loop()
  }

  setUpWebGL(canvas: HTMLCanvasElement) {
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

  selectProgramAndSetSdfUniforms (programUniLocsPairs: ProgramUniLocsPair[], shapeId: number) {
    const shapeState = this.store.shapeStates[shapeId]

    // select right program
    const programId = Math.floor(shapeState.shape)

    try {
      this.gl.useProgram(programUniLocsPairs[programId].program)
      const uniLocs = programUniLocsPairs[programId].uniLocs

      // set linear interpolation [0,1[
      this.gl.uniform1f(uniLocs.morph, shapeState.shape - programId) 

      // set other uniforms
      this.gl.uniform1f(uniLocs.twist, shapeState.twist);

      return uniLocs
    } catch (e) {
      console.warn('failed to use sdf program with id', programId)
    }
  }

  resize() { 
    const pixelRatio = window.devicePixelRatio || 1
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let width = screenWidth 
    let height = screenHeight
    let top = 0 
    let left = 0

    if(this.arShapeManager) {
      [left, top, width, height] = this.arShapeManager.resize(screenWidth, screenHeight) 
    }

    // resize canvas
    this.canvas.style.width = width + "px";
    this.canvas.style.height = height + "px";
    this.canvas.style.top = top + "px";
    this.canvas.style.left = left + "px";

    // wait for DOM before setting the new resolution
    setTimeout(() => {
      this.canvas.width = Math.round(width * pixelRatio / this.resolutionDivisor) 
      this.canvas.height = Math.round(height * pixelRatio / this.resolutionDivisor)

      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
      
      const aspectRatio = width / height

      if(this.shapeRenderer) {
        this.shapeRenderer.setAspectRatio(aspectRatio)
      }

      this.store.dimensions.width = screenWidth;
      this.store.dimensions.height = screenHeight;
    }) 
  }

  loop() {
    const now = Date.now()
    this.deltaTime = (now - this.lastDateNow) * 0.001
    this.lastDateNow = now
    this.time += this.deltaTime

    if(this.lastLoopCall !== undefined) {
      const timeSinceLoopCall = (now - this.lastLoopCall) * 0.001
      if(!(timeSinceLoopCall < 0.002)) {
        this.checkPerformanceAndAdjustResolution(timeSinceLoopCall)
      }
    }
    
    this.lastLoopCall = now

    // for rendering the scan - maybe make it a function of sampling

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)

    if(this.shapeRenderer) {
      let planeSegment = [[0,1],[0,1]]
      if(this.shapeSampler) {
        planeSegment = this.shapeSampler.scanSegment.map(
          angle => [Math.cos(angle), Math.sin(angle)]
        )
      }
      this.shapeRenderer.updateCamera(this.time) 
      this.shapeRenderer.render(this.targetShapeId, this.time, planeSegment)
    } else {
      if(this.arShapeManager && this.arShapeManager.ready) {
        this.arShapeManager.update(
          this.time, 
          this.deltaTime, 
          shapeId => this.store.shapeStates[shapeId].note
        )

        if(this.cubeRenderer) {
          this.arShapeManager.sortedShapes.forEach(shape => {
            if(shape.visible) {
              this.cubeRenderer!.render(shape.mvpMatrix, shape.color) 
            }
          })
        }

        this.arShapeManager.sortedShapes.forEach(shape => {
          if(shape.alpha) {
            this.cubedShapeRenderer!.render(
              shape.id, 
              shape.mvpMatrix, 
              shape.camPosition,
              shape.alpha, 
              shape.color, 
              shape.modelMatrix
            )
          }
        })
      }
    }

    if(this.shapeSampler) {
      if(this.visualizationRenderer) {
        if(this.shapeSampler.bufferTexture) {
          this.visualizationRenderer.render(
            this.shapeSampler.bufferTexture,
            this.shapeSampler.firstPeriodOffset, 
            this.shapeSampler.firstPeriodLength, 
            this.shapeSampler.signalCenter, 
            this.shapeSampler.signalNormalizeFactor
          )
        }
      }
    }

    requestAnimationFrame(this.loop.bind(this))
  }

  checkPerformanceAndAdjustResolution(timeBetweenLoopCalls: number) {
    this.avgRenderTime = (this.avgRenderTime * 9 + timeBetweenLoopCalls) * 0.1
    if(this.fps) {
      this.fps.textContent = Math.trunc(1 / this.avgRenderTime) + ' fps'
    }
    console.log(this.avgRenderTime) 
    if(this.avgRenderTime > this.maxRenderTime) {
      console.log('reducing resolution') 
      this.avgRenderTime = this.maxRenderTime * 0.75
      this.resolutionDivisor *= 2
      this.resize()
    }
  }
}


