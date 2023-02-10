#version 300 es

precision highp float; 

layout(location = 0) in vec3 vertex; 

uniform mat4 mvp;

void main() {
  gl_Position = mvp * vec4(vertex, 1);
}
