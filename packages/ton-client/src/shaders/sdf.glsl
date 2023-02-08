// forward declarations for the imported noise function to get correct line numbers
float snoise(vec4);

vec3 rotateY(vec3 v, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat3 m = mat3(c, 0, -s, 0, 1, 0, s, 0, c);
    return m * v;
}

vec3 rotateX(vec3 point, float angle) {
  mat4 rotationMatrix = mat4(1.0);
  rotationMatrix[1][1] = cos(angle);
  rotationMatrix[1][2] = -sin(angle);
  rotationMatrix[2][1] = sin(angle);
  rotationMatrix[2][2] = cos(angle);
  return (rotationMatrix * vec4(point, 1.0)).xyz;
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

float sdCutHollowSphere( vec3 p, float r, float h, float t )
{
  // sampling independent computations (only depend on shape)
  float w = sqrt(r*r-h*h);
  
  // sampling dependant computations
  vec2 q = vec2( length(p.xz), p.y );
  return ((h*q.x<w*q.y) ? length(q-vec2(w,h)) : 
                          abs(length(q)-r) ) - t;
}

float sdf(in vec3 p) {
  //return sdTriPrism(p, vec2(1, 1));
  //return length(p - vec3(0.5,0,0)) - 0.5;
  p = rotateY(p, p.y*1.);
  p = rotateY(p, p.y*1.);
  p = rotateX(p, p.x*1.);
  //return sdBox(p, vec3(tapState)) - 0.1;
  return sdTorus(p, vec2(0.4, 0.1)) - 0.1;
  //return sdCutHollowSphere(p, 0.8, 0.3, 0.4);
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
