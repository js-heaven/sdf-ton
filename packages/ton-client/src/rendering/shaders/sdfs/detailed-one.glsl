vec3 mp = mod(p + 0.1, 0.2) - 0.1;

vec3 rp = rotateX(p, 0.27); 
rp = rotateY(rp, 0.97); 
vec3 mrp = mod(rp + 0.125, 0.25) - 0.125;

return max( 
  max(
    min(
      sdBox(p, vec3(0.5, 0.7, 0.4)),
      sdBox(p - vec3(0.8, 0.4, 0.1), vec3(0.3, 0.3, 0.7))
    ), 
    length(mp) - 0.1
  ), 
  max(
    min(
      length(rp - vec3(0.1)) - 0.8,
      length(p - vec3(0.9, 0.3, -0.2)) - 0.4
    ),
    sdBox(mrp, vec3(0.1, 0.06, 0.08)) 
  ) 
) - 0.02;
