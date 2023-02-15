#version 300 es

precision highp float;

uniform vec3 color; 

in vec3 originalVertex;

out vec4 rgba; 

void main() {
  vec3 asd = abs(originalVertex);
  vec3 n = vec3(originalVertex.x, 0, 0); 
  if(asd.y > asd.x) {
    if(originalVertex.z > originalVertex.y) {
      n = vec3(0, 0, originalVertex.z); 
    } else {
      n = vec3(0, originalVertex.y, 0); 
    }
  } else if (asd.z > asd.x) {
    n = vec3(0, 0, originalVertex.z);
  }

  rgba = vec4(color * 0.4 + 0.2 + pow(originalVertex, vec3(5.0)) * 0.2, 1);
}
