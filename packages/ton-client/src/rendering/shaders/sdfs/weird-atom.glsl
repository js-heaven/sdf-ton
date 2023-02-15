vec2 c = vec2(sin(3.14 * 0.5),cos(3.14 * 0.5));

vec3 pAlt = vec3(p.z, -p.y, -p.x); 

return min(
  min(
    sdCappedTorus(p, c, 0.85, 0.1) - 0.05, 
    sdCappedTorus(pAlt, c, 0.85, 0.1) - 0.05
  ), 
  opSmoothUnion(
    length(p - 0.2) - 0.35, 
    length(p + 0.2) - 0.35, 
    0.25
  )
);
