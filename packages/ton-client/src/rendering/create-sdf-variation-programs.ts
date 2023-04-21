import { compileShaders, makeUniformLocationAccessor } from './shader-tools'
import twoBowls from './shaders/sdfs/two-bowls.glsl'
import oneOfTheFirst from './shaders/sdfs/one-of-the-first.glsl'
import twistedBox from './shaders/sdfs/twisted-box.glsl'
import weirdAtom from './shaders/sdfs/weird-atom.glsl'
import detailedOne from './shaders/sdfs/detailed-one.glsl'

const sdfs = [
  twistedBox,
  detailedOne,
  twoBowls,
  oneOfTheFirst, 
  weirdAtom, 
]

export const SDF_VARIANTS = sdfs.length

export interface ProgramUniLocsPair {
  program: WebGLProgram
  uniLocs: any
}

export function createSdfVariationPrograms(
  gl: WebGL2RenderingContext, vs: string, fs: string
): ProgramUniLocsPair[] {
  const result: ProgramUniLocsPair[] = []
  for(let i = 0; i < SDF_VARIANTS; i++) {
    const fsWithSdfsInserted = fs
      .replace('/*injected_sdf_1*/', sdfs[i])
      .replace('/*injected_sdf_2*/', sdfs[(i + 1) % SDF_VARIANTS])
    const program = compileShaders(gl, vs, fsWithSdfsInserted) 
    const uniLocs = makeUniformLocationAccessor(gl, program)

    gl.useProgram(program)
    gl.uniform1i(uniLocs.arpTexture, 2)

    result.push({ program, uniLocs })
  }
  return result
}
