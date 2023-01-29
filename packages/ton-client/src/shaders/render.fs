#version 300 es

precision highp float;

uniform vec3 camPosition;
uniform float time;

uniform vec2 swipeA;
uniform vec2 swipeB;

uniform vec3 touchManipulationState;

in vec3 ray;

out vec4 rgba;

// function for rotating around y axis
float sdf(vec3);

vec3 getNormal( in vec3 p ) // for function f(p)
{
    const float eps = 0.0001; // or some other value
    const vec2 h = vec2(eps,0);
    return normalize( vec3(sdf(p+h.xyy) - sdf(p-h.xyy),
                           sdf(p+h.yxy) - sdf(p-h.yxy),
                           sdf(p+h.yyx) - sdf(p-h.yyx) ) );
}

vec3 sky(vec3 v) {
  // shall be replaced with env map soon
  return vec3(v * 0.5 + 0.5);
}

const vec3 colorInside = vec3(0.1, 0.1, 0.3);
const vec3 colorOutside = vec3(1, 0.7, 0.5);
const vec3 scanColor = vec3(0.3,0.5,0.7);

void main() {
  vec3 rayDir = normalize(ray);

  vec3 rgb = sky(rayDir);

  // raymarch
  float z = 0.;
  vec3 pos = camPosition;
  float d = 0.;
  float a = 0.;
  float b = 0.;
  float xyAngle;

  vec3 color = vec3(1);
  vec3 normal;
  for (int s = 0; s < 50; s++) {
    d = sdf(pos) * 0.5;
    if(d < 0.01) {
      a = 0.1 + pow(0.9, z);
      b = clamp(length(pos), 0., 1.);

      // vec3 stepVis = float(s) * vec3(0.05);
      normal = getNormal(pos);
      color = 0.5 * (
        mix(colorInside, colorOutside, b) +
        clamp(pos * 0.5 + 0.5, 0., 1.)
      );
      color += max(0., dot(normal, vec3(-1,0.3,0))) * 0.5 * vec3(1.0,0.9,0.6);
      // see xournalpp sketch
      bool s1 = swipeA.x * pos.y <= pos.x * swipeA.y;
      bool s2 = pos.x * swipeB.y <= swipeB.x * pos.y;
      if(s1 && s2 || !s1 && !s2) {
        color += scanColor;
      }
      rgb = mix(rgb, color, a);
      break;
    }
    else if (d > 20.) {
      // we are on our way into space
      break;
    }
    d += 0.003;
    pos += rayDir * d;
    z += d;
  }

  rgba = vec4(rgb, 1.0);
}

#include sdf.glsl

