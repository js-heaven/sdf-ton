#version 300 es

precision highp float; 

layout(location = 0) in vec3 vertex; 

uniform mat4 mvp;

out vec3 modelVertex; 

void main() {
  modelVertex = vertex;
  gl_Position = mvp * vec4(vertex, 1);
  gl_PointSize /= gl_Position.w;
}
