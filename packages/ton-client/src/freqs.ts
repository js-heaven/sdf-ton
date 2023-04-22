import config from './config';

const HSLToRGB = (h: number, s: number, l: number) => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
};

const scale = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1] // half tones at 3,4 and 7,8
const colors: number[][] = []

// seven colors with equal hue distance
let colorId = 0
for(let i = 0; i < 7; i++) {
  colors[colorId] = HSLToRGB(i * 360 / 7, 75, 50);
  colorId = (colorId + 2) % 7
}

// freqFactor ** 12 = 2, Oktave
// freqFactor = 2 ** -12
const halfToneStepFactor = Math.pow(2, 1/12)
const freqs: number[] = []
for(let i = 0; i < config.numberOfOctaves * 12 + 1; i++) {
  if(scale[i % 12]) {
    freqs.push(config.baseFrequency)
  }
  config.baseFrequency *= halfToneStepFactor
}

export function getColor(freqId: number) {
  return colors[freqId % 7]
}

export default freqs

