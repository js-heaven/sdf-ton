p *= 2.; 
return 0.5 * min(
  min(
    length(p + vec3(0.5,0,0)) - 0.5,
    length(p + vec3(-0.3,0.3,0)) - 0.4 + 0.2 * bumps(p, 16.) - 0.5
  ),
  min(
    sdBox(p + vec3(0.3,0,0), vec3(0.5, 0., 1.2)) - 0.1,
    sdTriPrism(p + vec3(0,0.65,0.8), vec2(0.4, 0.4)) - 0.1
  )
);
