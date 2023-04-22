const bpm = 107;

const numberOfOctaves = 4

const config = {
  numberOfArps: 40, 
  baseFrequency: 440 / (2 ** 4), 
  barDuration: 60 / bpm * 4,

  numberOfOctaves,
  numberOfFreqs: 7 * numberOfOctaves + 1,
}

export default config

