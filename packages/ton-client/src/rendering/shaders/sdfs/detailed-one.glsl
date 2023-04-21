vec3 mp = mod(p + 0.1, 0.2) - 0.1;

vec3 rp = rotateX(p, 0.27); 
rp = rotateY(rp, 0.97); 
vec3 mrp = mod(rp + 0.125, 0.25) - 0.125;

return max( 
  max(
    sdBox(p, vec3(0.5, 0.7, 0.4)),
    length(mp) - 0.1
  ), 
  max(
    length(rp - vec3(0.1)) - 0.8,
    sdBox(mrp, vec3(0.1, 0.06, 0.08)) 
  ) 
) - 0.02;
