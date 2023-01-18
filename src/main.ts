import './style.css'

window.addEventListener('load', () => {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    depth: true,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true
  })
  if(!gl) {
    console.error(`WebGL2 is not supported`)
  }
  
})
