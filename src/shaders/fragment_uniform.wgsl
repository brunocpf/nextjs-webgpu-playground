struct Uniforms {
  time: vec4<f32>;   // x=time, y=mouseX, z=mouseY, w=pad
  res:  vec4<f32>;   // x=width, y=height, z=pad, w=pad
};
@group(0) @binding(0) var<uniform> U : Uniforms;

struct FSIn { @location(0) uv: vec2<f32> };

@fragment
fn fmain(in: FSIn) -> @location(0) vec4<f32> {
  let t = U.time.x;
  let r = U.res.xy;
  let p = (in.uv * 2.0 - vec2<f32>(1.0)) * vec2<f32>(r.x / max(r.y, 1.0), 1.0);
  let v = 0.5 + 0.5 * sin(3.0 * p.x + t) * cos(3.0 * p.y - t * 1.2);
  return vec4<f32>(v, 0.3 + 0.7 * v, 0.6 + 0.4 * v, 1.0);
}