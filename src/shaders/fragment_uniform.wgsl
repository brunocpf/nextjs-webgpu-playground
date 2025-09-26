struct Uniforms {
    time: vec4f,
    res: vec4f,
};

@group(0) @binding(0)
var<uniform> U: Uniforms;

@fragment
fn fmain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / U.res.xy;
    let t = U.time.x;
    let mouse = U.time.yz / U.res.xy;
    let dist = distance(uv, mouse);
    let mouseCircle = smoothstep(0.04, 0.03, dist);
    let color = 0.5 + 0.5 * sin(t + uv.xyx * 10.0);
    let finalColor = mix(color, vec3f(1.0, 0.2, 0.2), mouseCircle);
    return vec4f(finalColor, 1);
}
