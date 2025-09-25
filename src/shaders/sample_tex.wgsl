@group(0) @binding(0) var myTex : texture_2d<f32>;
@group(0) @binding(1) var mySampler : sampler;

struct FSIn { @location(0) uv: vec2<f32> };

@fragment
fn fmain(in: FSIn) -> @location(0) vec4<f32> {
  return textureSample(myTex, mySampler, in.uv);
}
