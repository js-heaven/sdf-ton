vec3 q = p; 
if(q.x > 0.) {
  q.x -= 0.45;
} else {
  q.x = -(q.x + 0.45); 
}
vec3 r = vec3(
  q.x * 0.7071 + q.y * 0.7071,
  q.y * 0.7071 - q.x * 0.7071,
  q.z
); 
return bowl(r);
