#version 300 es

precision highp float; 

layout(location = 0) in vec2 vertex; 

uniform mat4 viewMatrix; 
uniform float aspectRatio; 
uniform float nearPlaneSize; 

out vec2 uv; 
out vec2 screenCoords; 
out vec3 viewDirection; 

void main() {
  uv = vertex * 0.5 + 0.5; 

  screenCoords = vec2(vertex.x * aspectRatio, vertex.y);
  
  viewDirection = vec3(viewMatrix * vec4(-nearPlaneSize * screenCoords, 1, 0)); 

  gl_Position = vec4(vertex, 0, 1);
}
