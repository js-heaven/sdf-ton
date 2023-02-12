#version 300 es

precision highp float; 

uniform sampler2D samples;

uniform float bufferSize;
uniform float sqrtBufferSize;

uniform float periodBegin; // in samples
uniform float periodLength; // in samples

uniform float center;
uniform float normalizeFactor; 

const float lineWidth = 0.001; 
const vec3 lineColor = vec3(0.5, 0.5, 0.5);

const float waveHeight = 0.2;
const float waveHeightHalf = waveHeight * 0.5;
const float oneMinusWaveHeightHalf = 1.0 - waveHeightHalf;

in vec2 uv;

out vec4 rgba; 

float getSampleValue(float sampleIndex) {
  float ix = mod(sampleIndex, sqrtBufferSize);
  float iy = floor(sampleIndex / sqrtBufferSize); 

  int iRgba = int(mod(ix, 4.)); 
  ix = floor(ix / 4.);

  vec4 fourSamples = texture(samples, (vec2(ix * 4., iy) + vec2(0.5)) / sqrtBufferSize); 

  float s = fourSamples[iRgba];

  // normalize to values from -1 to 1
  s = (s - center) * normalizeFactor;

  return (s);
}

bool isInside(float center, float y, float v) {
  float relativeY = y - center;
  float scaledV = v * waveHeightHalf;
  return (
    relativeY > scaledV && relativeY < 0. ||
    relativeY < scaledV && relativeY > 0.
  );
}

void main() {
  // look up the buffer value for this fragment's y 
  float bufferValue = getSampleValue(
    uv.x * bufferSize - 0.5
  );

  // look up the period value for this fragment's y 
  float periodValue = getSampleValue(
    periodBegin + periodLength * uv.x - 0.5
  );

  // periodValue = (periodBegin + periodLength * uv.x) / bufferSize;
  if(
    uv.y > oneMinusWaveHeightHalf - lineWidth && uv.y < oneMinusWaveHeightHalf + lineWidth || 
    uv.y > waveHeightHalf - lineWidth && uv.y < waveHeightHalf + lineWidth
  ) {
    rgba = vec4(lineColor, 1.0); 
  } else if(isInside(waveHeightHalf, uv.y, bufferValue)) {
    rgba = vec4(0.9,0,0.3,0.5); 
  } else if(isInside(oneMinusWaveHeightHalf, uv.y, periodValue)) {
    rgba = vec4(0.0,0.4,1.,0.5); 
  } else {
    discard; 
  } 
}

