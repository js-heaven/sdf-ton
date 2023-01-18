#version 300 es

precision highp float; 

uniform vec3 camPosition;
uniform float time;

in vec3 ray; 

out vec3 rgb; 

#include 4d-noise.glsl

// function for rotating around y axis
vec3 rotateY(vec3 v, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec3(
        v.x * c + v.z * s,
        v.y,
        v.z * c - v.x * s
    );
}

float sdf(vec3 p) { 
  // p.y = p.y * 0.5; 
  // p = rotateY(p, p.y * 2.); 

  p = mod(p + 2., 4.) - 2.; 

  return length(p) - 1.0 
    + 0.4 * snoise(vec4(p * 0.5, 0.1 * time))
    + .2 * snoise(vec4(p * 1., 0.1 * time)); 

  // return min(
  //   length(mod(p + 2., 4.) - 2.) - 1.0 + s, 
  //   length(p + vec3(4,1,2)) - 3.0 + s
  // ) - s; 
}

void main() {
  vec3 rayDir = normalize(ray);

  rgb = vec3(rayDir * 0.5 + 0.5) * 0.4; 

  // raymarch 
  float z = 0.; 
  vec3 pos = camPosition;
  float d = 0.; 
  float a = 0.;
  float b = 0.; 
  vec3 colorInside = vec3(0.2, 0.2, 0.6); 
  vec3 colorOutside = vec3(1, 0.4, 0.3); 
  vec3 color = vec3(1);
  for (int s = 0; s < 20; s++) {
    d = sdf(pos);
    if(d < 0.001) {
      a = min(1., 2.45 / z); 
      b = length(mod(pos + 2., 4.) - 2.); 
      color = mix(colorInside, colorOutside, b);
      rgb = mix(rgb, color, a) * b;
      break;
    }
    d += 0.01; // get faster past surfaces (any way to respect slope?) linearly?
    pos += rayDir * d;
    z += d;
  }
}

