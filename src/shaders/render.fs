#version 300 es

precision highp float; 

in vec2 uv;
in vec2 screenCoords;
in vec3 viewDirection; 

out vec4 rgba; 

void main() {
  rgba = vec4(uv, 0, 0);
}
