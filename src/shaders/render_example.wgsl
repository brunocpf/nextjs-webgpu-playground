struct Uniforms {
    time: vec4f,
    res: vec4f,
};

@group(0) @binding(0)
var<uniform> U: Uniforms;


fn sdfCircle(p: vec2f, r: f32) -> f32 {
    return length(p) - r;
}

@fragment
fn fmain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv = pos.xy / U.res.xy;
    let t = U.time.x;
    let mouse = U.time.yz / U.res.xy;
    let aspect = U.res.x / U.res.y;
    let uv_corr = vec2f((uv.x - 0.5) * aspect + 0.5, uv.y);
    let mouse_corr = vec2f((mouse.x - 0.5) * aspect + 0.5, mouse.y);
    let dist = distance(uv_corr, mouse_corr);
    let mouseCircle = smoothstep(0.04, 0.03, dist);
    let color = 0.5 + 0.5 * sin(t + uv.xyx * 10.0);
    let finalColor = mix(color, vec3f(1.0, 1.0, 0.2), mouseCircle);
    return vec4f(finalColor, 1);
}
