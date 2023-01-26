#version 300 es

precision highp float; 

uniform sampler2D samples;
uniform float bufferSize;
uniform float sqrtBufferSize;

uniform float periodBegin; // in samples
uniform float periodLength; // in samples

in vec2 uv;

out vec4 rgba; 

float getSampleValue(float sampleIndex) {
  float ix = mod(sampleIndex, sqrtBufferSize);
  float iy = floor(sampleIndex / sqrtBufferSize); 

  int iRgba = int(mod(ix, 4.)); 
  ix = floor(ix / 4.);

  vec4 fourSamples = texture(samples, (vec2(ix * 4., iy) + vec2(0.5)) / sqrtBufferSize); 

  return fourSamples[iRgba];
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

  bool disc = true; 
  vec3 rgb = vec3(0.5); 
  if(uv.y < bufferValue * 0.25) {
    //rgb = mix(rgb, vec3(0.3,0,0.1), 0.5); 
    //disc = false; 
  } 
  if(uv.y < periodValue * 0.25) {
    rgb = mix(rgb, vec3(0.0,0.1,0.5), 0.9); 
    disc = false; 
  }

  if(disc) {
    discard; 
  } else {
    rgba = vec4(rgb, 0.5); 
  }
}


