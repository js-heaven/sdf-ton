export function makeDrawScreenQuad(gl: WebGL2RenderingContext) {
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
export function makeDrawCube(gl: WebGL2RenderingContext) {
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

