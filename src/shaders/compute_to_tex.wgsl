@group(0) @binding(0) var outTex : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let dims = textureDimensions(outTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let cx = (gid.x / 32u) % 2u;
  let cy = (gid.y / 32u) % 2u;
  let v = cx ^ cy;

  let color = select(vec4<u32>(255u, 32u, 64u, 255u),
                     vec4<u32>(32u, 128u, 255u, 255u),
                     v == 1u);

  textureStore(outTex, vec2<i32>(gid.xy), color);
}