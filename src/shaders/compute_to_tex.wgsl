// BEFORE (invalid for rgba8unorm):
// let color = vec4<u32>(255, 32, 64, 255);

// AFTER: use normalized floats (0..1) for rgba8unorm
@group(0) @binding(0) var outTex : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let dims = textureDimensions(outTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let cx = (gid.x / 32u) % 2u;
  let cy = (gid.y / 32u) % 2u;
  let v = cx ^ cy;

  // two colors in 0..1
  let a = vec4<f32>(1.0, 0.125, 0.25, 1.0);   // #FF2040
  let b = vec4<f32>(0.125, 0.5, 1.0, 1.0);    // #2080FF
  let color = select(a, b, v == 1u);

  textureStore(outTex, vec2<i32>(gid.xy), color);
}