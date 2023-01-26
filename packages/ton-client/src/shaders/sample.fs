#version 300 es

precision highp float;

uniform float sqrtBufferSize;
uniform float oneByBufferSize;

uniform float startAngle;
uniform float endAngle;

uniform float planeStartAngle;
uniform float planeEndAngle;

uniform float radius;

uniform vec3 touchManipulationState;

in vec2 uv;

// we would like to write only one float per fragment
// but in WebGL 2.0 we can only read RGBAF32 floats from framebuffers
// so we need to do 4 samples per fragment :)
out vec4 rgba;

// forward declaration for the imported sdf
float sdf(vec3, vec3);

void main() {
  vec4 samples;
  for(int s = 0; s < 4; s++) {

    float ix = (uv.x - 0.5) * 4. + float(s);
    float i = ix + (uv.y - 0.5) * sqrtBufferSize;

    // plane
    // the plane rotates every bar
    // the the axis of plane rotation rotates every 4 bars
    float planeAngle = mix(planeStartAngle, planeEndAngle, i * oneByBufferSize);
    vec3 planeX = vec3(
      cos(planeAngle),
      sin(planeAngle),
      0
    );
    vec3 planeZ = vec3(0, 0, 1);

    vec3 scale = vec3(0.75 + 0.15 * touchManipulationState.x);

    // camera position on circle on plane
    float angle = mix(startAngle, endAngle, i * oneByBufferSize);

    vec3 pos = planeX * cos(angle) + planeZ * sin(angle);

    vec3 dir = -pos;
    pos *= radius;

    float z = 0.;
    float d = 0.;

    for (int m = 0; m < 50; m++) {
      d = sdf(pos, scale) * 0.3;
      pos += dir * d;
      z += d;
      if(d < 0.001 || z >= radius) {
        break;
      }
    }

    samples[s] = max(0., radius - z);
  }
  rgba = samples;
}

#include sdf.glsl
