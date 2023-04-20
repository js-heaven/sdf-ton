#version 300 es

precision highp float;

uniform sampler2D envFront;
uniform sampler2D envBack;

uniform sampler2D arpTexture;
uniform float noteLength; 
uniform float currentSlot;

uniform float alpha;

uniform vec3 camPosition;

uniform vec3 shapeColor; 

uniform mat3 inverseModelMatrix; 

in vec3 modelVertex;

out vec4 rgba;

// function for rotating around y axis
#include sdf.glsl

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

const vec3 sunColor = vec3(0.9,0.8,0.7);

const float carefulness = 0.5; 

const float threshold = 0.1; 
const float boundary = 1. + threshold / carefulness; 

void main() {
  vec3 ray = modelVertex - camPosition;
  vec3 rayDir = normalize(ray);

  vec3 rgb = sky(rayDir);

  // raymarch
  float z = 0.;
  vec3 pos = modelVertex;
  float d = 0.;
  float a = 0.;
  float b = 0.;
  float xyAngle;

  vec3 color = vec3(1);
  vec3 normal;
  for (int s = 0; s < 30; s++) {
    d = sdf(pos) * carefulness;
    if(
      d < 0. || 
      // or if we leave the cube
      abs(pos.x) > boundary ||
      abs(pos.y) > boundary ||
      abs(pos.z) > boundary 
    ) {
      break;
    } 
    pos += rayDir * d;
    z += d;
  }

  if(d < threshold) {
    a = 0.1 + pow(0.9, z);
    b = clamp(length(pos), 0., 1.);

    // vec3 stepVis = float(s) * vec3(0.05);
    normal = inverseModelMatrix * getNormal(pos); 

    vec3 r = reflect(rayDir, normal);
    vec3 env;
    if( r.z > 0.) {
      env = texture(envFront, r.xy * 0.5 + 0.5).rgb;
    } else {
      env = texture(envBack, r.xy * 0.5 + 0.5).rgb;
    }

    color = (env + shapeColor * b) * 0.5; 

    // lights
    color += dot(normal, vec3(0,1,0)) * sunColor * 0.5;

    rgb = color;
  } else {
    discard;
  }

  rgba = vec4(rgb, alpha);
}

