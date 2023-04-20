import arps from './arps'

export default function make1DArpTexture(gl: WebGL2RenderingContext) {
  return arps.map(arp => {
    // create 1D texture
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    // fill data
    const data = new Uint8Array(arp.slotsPerBar).fill(0)
    arp.triggers.forEach(trigger => {
      data[trigger.slot] = 255
    })
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8,
      arp.slotsPerBar,
      1,
      0,
      gl.RED,
      gl.UNSIGNED_BYTE,
      data
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    return texture
  })
}

