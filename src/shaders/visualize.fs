#version 300 es

precision highp float; 

uniform sampler2D samples;
uniform float bufferSize;
uniform float sqrtBufferSize;

in vec2 uv;

out vec4 rgba; 

void main() {
  float i = uv.x * bufferSize - 0.5; 
  float ix = mod(i, sqrtBufferSize);
  float iy = floor(i / sqrtBufferSize); 

  int iRgba = int(mod(ix, 4.)); 
  ix = floor(ix / 4.);

  vec4 color = texture(samples, (vec2(ix * 4., iy) + vec2(0.5)) / sqrtBufferSize); 

  float value = color[iRgba];

  if(uv.y < value * 0.25) {
    rgba = vec4(0.3,0,0.1,0.5); 
  } else {
    discard; 
  }
}


