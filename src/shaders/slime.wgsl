@group(0) @binding(0) var outTex : texture_storage_2d<rgba8unorm, write>;

struct Agent {
  pos: vec2<f32>,
  angle: f32,
};

// create an array of Agents in a storage buffer
@group(0) @binding(1) var<storage, read> agents: array<Agent>;

// create a texture for the trail map
@group(0) @binding(2) var trailMap: texture_storage_2d<rgba8unorm, read_write>;

fn hash(u: u32) -> u32 {
  var v = u;
  v = ((v >> 16u) ^ v) * 0x45d9f3bu;
  v = ((v >> 16u) ^ v) * 0x45d9f3bu;
  v = (v >> 16u) ^ v;
  return v;
}

@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let dims = textureDimensions(outTex);
  if (gid.x >= dims.x || gid.y >= dims.y) { return; }

  let i = gid.y * dims.x + gid.x;

  let pseudoRandomNumber = hash(i);
  let gray = f32(pseudoRandomNumber % 256u) / 255.0;
  let color = vec4<f32>(gray, gray, gray, 1.0);

  textureStore(outTex, vec2<i32>(gid.xy), color);
}