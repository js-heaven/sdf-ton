uniform float twist;
uniform float morph;

#include noise.glsl

/* SDF helper functions */

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

vec3 opCheapBend(vec3 p , float k)
{
    float c = cos(k*p.x);
    float s = sin(k*p.x);
    mat2  m = mat2(c,-s,s,c);
    return vec3(m*p.xy,p.z);
}

vec3 opTwist(vec3 p , float k)
{
    float c = cos(k*p.y);
    float s = sin(k*p.y);
    mat2  m = mat2(c,-s,s,c);
    vec3 q = vec3(m*p.xz,p.y);
    return vec3(q.xz, q.y);
}


float opDisplace(vec3 p, float h, float k)
{
  return h + sin(20.*p.x)*sin(20.*p.y)*sin(20.*p.z)/k;
}

// float opSmoothUnion(float d1, float d2, float k)
// {
//     float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
//     return mix( d2, d1, h ) - k*h*(1.0-h);
// }


vec3 opElongate(vec3 p,  float k)
{
    vec3 h = vec3(0.1, 0.1, 0.1) * k;
    vec3 q = p - clamp( p, -h, h );
    return q;
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


/* SDF primitives */

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

float sdCutHollowSphere( vec3 p, float r, float h, float t )
{
  // sampling independent computations (only depend on shape)
  float w = sqrt(r*r-h*h);

  // sampling dependant computations
  vec2 q = vec2( length(p.xz), p.y );
  return ((h*q.x<w*q.y) ? length(q-vec2(w,h)) :
                          abs(length(q)-r) ) - t;
}

float sdLink( vec3 p, float le, float r1, float r2 )
{
  vec3 q = vec3( p.x, max(abs(p.y)-le,0.0), p.z );
  return length(vec2(length(q.xy)-r1,q.z)) - r2;
}

float sdTriPrism( vec3 p, vec2 h )
{
  vec3 q = abs(p);
  return max(q.z-h.y,max(q.x*0.866025+p.y*0.5,-p.y)-h.x*0.5);
}

float opSmoothUnion( float d1, float d2, float k )
{
    float h = max(k-abs(d1-d2),0.0);
    return min(d1, d2) - h*h*0.25/k;
}

float sdCappedTorus(in vec3 p, in vec2 sc, in float ra, in float rb)
{
  p.x = abs(p.x);
  float k = (sc.y*p.x>sc.x*p.y) ? dot(p.xy,sc) : length(p.xy);
  return sqrt( dot(p,p) + ra*ra - 2.0*ra*k ) - rb;
}


/* SDF Zoo 
   Let's keep some options for sdfs lingering around. 
   At some point, we can combine them before compiling the program 
   and have different "presets" that way */

float sdf_multiplePrimitives(in vec3 p) {
  p += vec3(0, -1.2, 0); 
  float d = sdTorus(p, vec2(0.5, 0.2)); 
  for(int i = 0; i < 10; i++) {
    vec3 q = p + float(i) * vec3(0, 0.3, 0);
    d = opSmoothUnion(d, sdTorus(q, vec2(0.5, 0.1)), 0.1);
  }
  d = min(d, sdBox(p + vec3(0,1,0), vec3(0.1, 2.3, 0.1)));
  d = min(d, sdTorus(p + vec3(0, 2., 0), vec2(0.5, 0.2))); 
  return d;
}

float sdf_C(in vec3 p) {
  return length(p + vec3(0.3, 0, 0)) - 0.7 + 0.2 * diamonds(p, 7.);
}

float sdf_heavy_calculations(in vec3 p) {
  float v = 0.; 
  float f = 0.3; 
  for(int i = 0; i < 4; i++) {
    f *= 2.;
    v += snoise3d(p * f) / f;
  }
  return v; 
}

float injected_sdf_1(in vec3 p) {
/*injected_sdf_1*/
}

float injected_sdf_2(in vec3 p) {
/*injected_sdf_2*/
}

float sdf_lerp(in vec3 p) {
  float d1 = injected_sdf_1(p);
  float d3 = injected_sdf_2(p);
  return mix(d1, d3, morph);
}

/* main sdf function */

float sdf(in vec3 p) {
  return sdf_lerp(p);
}

