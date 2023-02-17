#version 300 es

precision highp float; 

layout(location = 0) in vec2 vertex; 

// ray direction
out vec2 uv;

void main() {
  uv = vertex * 0.5 + 0.5;
  gl_Position = vec4(vertex, 0, 1);
}
