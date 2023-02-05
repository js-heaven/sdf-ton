// forward declarations for the imported noise function to get correct line numbers
float snoise(vec4);

vec3 rotateY(vec3 v, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat3 m = mat3(c, 0, -s, 0, 1, 0, s, 0, c);
    return m * v;
}

float diamonds(vec3 p, float scale) {
  p *= scale;
  return (
    abs(mod(p.x, 2.) - 1.) +
    abs(mod(p.y, 2.) - 1.) +
    abs(mod(p.z, 2.) - 1.)
  ) / scale;
}

float bumps(vec3 p, float scale) {
  p = mod(scale * p, 2.) - 1.;
  return length(p) / scale;
}

float sdTorus( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdTriPrism( vec3 p, vec2 h )
{
  vec3 q = abs(p);
  return max(q.z-h.y,max(q.x*0.866025+p.y*0.5,-p.y)-h.x*0.5);
}

float sdf(in vec3 p) {
  //return sdTriPrism(p, vec2(1, 1));
  //return length(p - vec3(0.5,0,0)) - 0.5;
  p = rotateY(p, p.y*1.);
  return sdBox(p, vec3(tapState)) - 0.1;
  // return min(
  //   min(
  //     length(p + vec3(0.5,0,0)) - 0.5,
  //     length(p + vec3(-0.3,0.3,0)) - 0.4 + 0.2 * bumps(p, 16.) - 0.5
  //   ),
  //   min(
  //     sdBox(p + vec3(0.3,0,0), vec3(0.5, 0., 1.2)) - 0.1,
  //     sdTriPrism(p + vec3(0,0.65,0.8), vec2(0.4, 0.4)) - 0.1
  //   )
  // );
}

#include 4d-noise.glsl
