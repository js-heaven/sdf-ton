#version 300 es

precision highp float; 

uniform vec3 camPosition;

in vec3 ray; 

out vec3 rgb; 

float sdf(vec3 p) { 
  float s = 1.;
  return min(
    length(mod(p + 2., 4.) - 2.) - 1.0 + s, 
    length(p + vec3(4,1,2)) - 3.0 + s
  ) - s; 
}

void main() {
  vec3 rayDir = normalize(ray);

  rgb = vec3(rayDir * 0.5 + 0.5) * 0.4; 

  // raymarch 
  float z = 0.1; 
  vec3 pos = camPosition + rayDir * z;
  float d = 0.; 
  float a = 0.;
  for (int s = 0; s < 40; s++) {
    d = sdf(pos);
    if(d < 0.001) {
      a = min(1., 2.45 / z); 
      rgb = mix(rgb, vec3(1, 0.4, 0.3), a);
      break;
    }
    d += 0.1; // get faster past surfaces (any way to respect slope?) linearly?
    pos += rayDir * d;
    z += d;
  }
}
