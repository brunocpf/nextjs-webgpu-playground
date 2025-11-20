import tgpu from "typegpu";
import * as d from "typegpu/data";

import {
  mousePosAccess,
  resolutionAccess,
  timeAccess,
} from "@/shaders/accessors";

export const exampleFragment2 = tgpu["~unstable"].fragmentFn({
  in: { uv: d.vec2f },
  out: d.vec4f,
}) /* wgsl */ `{
    let aspect = resolution.x / resolution.y;
    let correctedUv = vec2<f32>(in.uv.x * aspect, in.uv.y);
    let correctedMousePos = vec2<f32>(
        mousePos.x / resolution.x,
        1.0 - (mousePos.y / resolution.y)
    );

    let dist = distance(correctedUv, correctedMousePos);
    let speed = 2.0;
    let pulse = (sin(time * speed) + 1.0) * 0.5;
    let radiusMin = 0.03;
    let radiusMax = 0.08;
    let radius = mix(radiusMin, radiusMax, pulse);
    let background = vec4<f32>(0.2, 0.5, 1.0, 1.0);
    let circleColor = vec4<f32>(1.0, 0.5, 0.2, 1.0);

    let aaWidth = fwidth(dist);
    let t = smoothstep(radius - aaWidth, radius + aaWidth, dist);
    let finalColor = mix(circleColor, background, t);

    return finalColor;
}
`.$uses({
  time: timeAccess,
  resolution: resolutionAccess,
  mousePos: mousePosAccess,
});
