export function compileShaders(gl: WebGL2RenderingContext, vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram {
  const shader = [
    loadShader(gl, vertexShaderSource, gl.VERTEX_SHADER), 
    loadShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER)
  ]
  return createProgram(gl, shader)
}

function loadShader(gl: WebGL2RenderingContext, shaderSource: string, shaderType: number) {
  const shader = gl.createShader(shaderType); 
  if(shader) {
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    
    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if(compiled) {
      return shader;
    } else {
      const lastError = gl.getShaderInfoLog(shader); 
      console.log('shader source:', shaderSource); 
      throw(new Error("Error when compiling shader:" + lastError))
    } 
  } else {
    throw(new Error("WebGL could not create shader object"))
  }
}
  
function createProgram(gl: WebGL2RenderingContext, shaders: WebGLShader[]) {
  const program = gl.createProgram()
  if(program !== null) {
    shaders.forEach(shader => {
      gl.attachShader(program!, shader);
    })
    gl.linkProgram(program); 
  
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS)
    if(!linked){
      const lastError = gl.getProgramInfoLog(program);
      throw(new Error("Error when linking shaders:" + lastError))
    } else {
      // TODO: calc return unilocs as well. let uniLocs = 
      return program;
    }
  } else {
    throw(new Error("WebGL could not create program object") )
  }
}

export function makeUniformLocationAccessor(gl: WebGL2RenderingContext, program: WebGLProgram) {
  return new Proxy(
    {} as {[name: string]: WebGLUniformLocation | null}, 
    {
      get(target, prop: string, _receiver) {
        let v = target[prop]
        if(v == undefined) {
          target[prop] = v = gl.getUniformLocation(program, prop)
        }
        return v
      }
    }
  )
}
