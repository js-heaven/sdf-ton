#version 300 es

precision highp float;

uniform sampler2D envFront;
uniform sampler2D envBack;

uniform sampler2D arpTexture;
uniform float slotsPerBar; 
uniform float currentSlot; 

uniform float alpha;

uniform vec3 camPosition;

uniform vec3 baseColor; 

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

vec3 arpVis(float y) {
  float barPos = 1. - mod(y + 10., 1.);
  float arp = texture(arpTexture, vec2(barPos, 0.5)).r;
  float slot = barPos * slotsPerBar; 
  float slotFloor = floor(slot);
  float triggered = 0.; 

  if(slotFloor == floor(currentSlot)) {
    float slotProgress = fract(currentSlot - slotFloor);
    triggered = 4. * (1. - slotProgress) * slotProgress;
  }

  return (arp - 0.5) * vec3(0.4) + 
    triggered * vec3(0.6, 0.3, 0.2);
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
  float b = 0.;
  float xyAngle;

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
    b = 0.2 + 0.8 * clamp(length(pos), 0., 1.); 

    normal = inverseModelMatrix * getNormal(pos); 

    vec3 r = reflect(rayDir, normal);
    vec3 env;
    if( r.z > 0.) {
      env = texture(envFront, r.xy * 0.5 + 0.5).rgb;
    } else {
      env = texture(envBack, r.xy * 0.5 + 0.5).rgb;
    }

    vec3 color = baseColor + arpVis(pos.y * 1.2); 
    color += dot(normal, vec3(0,1,0)) * sunColor * 0.5;
    color += env * 0.5;  
    color *= b; 


    // lights

    rgb = color;
  } else {
    discard;
  }

  rgba = vec4(rgb, alpha);
}

