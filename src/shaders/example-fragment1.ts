import tgpu from "typegpu";
import * as d from "typegpu/data";

export const exampleFragment1 = tgpu["~unstable"].fragmentFn({
  in: { uv: d.vec2f },
  out: d.vec4f,
}) /* wgsl */ `{
    return vec4f(in.uv.x, in.uv.y, 0.0, 1.0);
}
`;
