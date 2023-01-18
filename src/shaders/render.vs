#version 300 es

precision highp float; 

layout(location = 0) in vec2 vertex; 

uniform float time; 

// camStraight is the direction the camera is facing.
// and it should be 1 away from the camera.
uniform vec3 camStraight; 

// 2 * |camRight| * 2 * |camUp| == nearPlaneSurface
uniform vec3 camRight; 
uniform vec3 camUp;

// ray direction
out vec3 ray;

void main() {
  ray = camStraight + camRight * vertex.x + camUp * vertex.y;
  gl_Position = vec4(vertex, 0, 1);
}
