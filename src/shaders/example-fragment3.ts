import tgpu from "typegpu";
import * as d from "typegpu/data";

import { timeAccess } from "@/shaders/accessors";

export const exampleFragment3 = tgpu["~unstable"].fragmentFn({
  in: { uv: d.vec2f },
  out: d.vec4f,
}) /* wgsl */ `{
    let speed = 2.0;
    let pulse = (sin(time * speed) + 1.0) * 0.5;
    let green = mix(0.2, 1.0, pulse);
    let finalColor = vec4<f32>(in.uv.x, green, in.uv.y, 1.0);

    return finalColor;
}
`.$uses({
  time: timeAccess,
});
