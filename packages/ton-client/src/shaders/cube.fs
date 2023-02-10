#version 300 es

precision highp float;

uniform vec3 color; 

out vec4 rgba; 

void main() {
  rgba = vec4(color, 1);
}
