import { mat4, vec3 } from 'gl-matrix';
import ARToolkit from 'artoolkit5-js'

export class Shape {
  visible = false
  markerTransformMat = new Float64Array(12)
  transformMat = mat4.create()
  glMatrix = mat4.create()
  color: number[]

  modelViewMatrix = mat4.create()
  mvpMatrix = mat4.create()

  inverseModelViewMatrix = mat4.create()

  camPosition = vec3.create()

  fadeOut = 0
  fadeIn = 0
  cameraDistance = 0

  id: number

  constructor(id: number) {
    this.id = id
    this.color = [Math.random(), Math.random(), Math.random()]
  }
}

export default class ArShapeManager {
  cameraMatrix = mat4.create()
  arController = undefined as any

  portraitCorrectionMatrix = mat4.create()
  projectionMatrix = mat4.create()

  numberOfShapes = 3
  shapes: Shape[] = []
  sortedShapes: Shape[] = []
  closestShape: Shape | undefined

  modelMatrix = mat4.create()
  fixedModelMatrix = mat4.create()

  fadeTime = 0.3

  constructor(
    private cam: HTMLVideoElement, 
    resize: () => void,
  ) {
    cam.style.display = 'block'

    for(let i = 0; i < this.numberOfShapes; i++) {
      this.shapes.push(new Shape(i))
    }

    mat4.fromZRotation(this.portraitCorrectionMatrix, Math.PI / 2)

    cam.addEventListener('play', () => {
      ARToolkit.ARController.initWithImage(
        cam, 
        '/camera_para.dat', {
          orientation: 'landscape',
        }
      ).then((controller: any) => { 
        controller.setPatternDetectionMode(artoolkit.AR_MATRIX_CODE_DETECTION);
        controller.setMatrixCodeType(artoolkit.AR_MATRIX_CODE_3x3_HAMMING63);
        // controller.setThresholdMode(artoolkit.AR_LABELING_THRESH_MODE_AUTO_OTSU); 
        this.cameraMatrix = mat4.clone(controller.getCameraMatrix())
        this.arController = controller
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

    mat4.fromXRotation(this.fixedModelMatrix, Math.PI / 2) 
    mat4.translate(this.fixedModelMatrix, this.fixedModelMatrix, [0., 1., 0])
  }

  resize(screenWidth: number, screenHeight: number) {
    const screenRatio = screenWidth / screenHeight
    let left, top

    if(this.arController) {
      if(screenRatio < 1) {
        this.arController.orientation = 'portrait'
        mat4.mul(this.projectionMatrix, this.portraitCorrectionMatrix, this.cameraMatrix)
      } else {
        this.arController.orientation = 'landscape'
        mat4.copy(this.projectionMatrix, this.cameraMatrix)
      }
    }

    // reset shape visible
    for(let i = 0; i < this.numberOfShapes; i++) {
      this.shapes[i].visible = false
    }

    // resize cam video
    const sourceWidth = this.cam.videoWidth;
    const sourceHeight = this.cam.videoHeight;
    const webcamRatio = sourceWidth / sourceHeight

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

    const width = sourceWidth * scale
    const height = sourceHeight * scale

    this.cam.style.width = width + "px";
    this.cam.style.height = height + "px";
    this.cam.style.top = top + "px";
    this.cam.style.left = left + "px";

    return [left, top, width, height]
  }

  update(time: number, deltaTime: number) {
    this.arController.detectMarker();
    const num = this.arController.getMarkerNum()
    let info, id, shape, transformation
    const visibleShapes = new Set()
    for(let i = 0; i < num; i++) {
      info = this.arController.getMarker(i)
      id = info.idMatrix
      if(id != -1) {
        visibleShapes.add(id)
        shape = this.shapes[id]
        transformation = shape.markerTransformMat
        const width = 1
        if(shape.visible) { 
          this.arController.getTransMatSquareCont(i, width, transformation, transformation)
        } else {
          this.arController.getTransMatSquare(i, width, transformation) 
        }
        this.arController.transMatToGLMat(transformation, shape.transformMat) 
        this.arController.arglCameraViewRHf(shape.transformMat, shape.glMatrix) 
      }     
    }
    for(let i = 0; i < this.numberOfShapes; i++) {
      const shape = this.shapes[i]
      shape.fadeIn = Math.max(0, shape.fadeIn - deltaTime)
      shape.fadeOut = Math.max(0, shape.fadeOut - deltaTime)

      if(visibleShapes.has(i)) {
        if(!shape.visible) {
          shape.fadeIn = this.fadeTime - shape.fadeOut
        }
        shape.visible = true; 
        mat4.rotateY(this.modelMatrix, this.fixedModelMatrix, time * 0.1)
        mat4.mul(shape.modelViewMatrix, shape.glMatrix, this.modelMatrix)
        mat4.mul(shape.mvpMatrix, this.projectionMatrix, shape.modelViewMatrix)

        const shapeCamPosition = vec3.create()
        mat4.invert(shape.inverseModelViewMatrix, shape.modelViewMatrix)

        vec3.transformMat4(shape.camPosition, shapeCamPosition, shape.inverseModelViewMatrix)
        shape.cameraDistance = vec3.length(shapeCamPosition)
      } else {
        if(shape.visible) {
          shape.fadeOut = this.fadeTime - shape.fadeIn
        }
        shape.visible = false
      }
    }
    // order shapes by camera distance, because transparency during fade
    this.sortedShapes = this.shapes.slice().sort((a, b) => {
      return b.cameraDistance - a.cameraDistance 
    })

    this.closestShape = undefined
    for(let i = 7 ; i >= 0; i--) {
      if(this.sortedShapes[i].visible) {
        this.closestShape = this.sortedShapes[i]
        break
      }
    }
  }

  getShapesSortedByDistance() {
    return this.sortedShapes
  }

  getClosestShape() {
    return this.closestShape
  }
}