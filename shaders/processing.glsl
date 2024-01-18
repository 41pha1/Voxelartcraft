precision mediump float;

uniform sampler2D u_targetImage;
uniform sampler2D u_palette;
uniform float u_paletteSize;

uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;

varying vec2 v_texcoord;

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec2 uv = v_texcoord * 0.5 + 0.5;
    //uv.y = 1.0 - uv.y;
    vec4 col = texture2D(u_targetImage, uv); 

    if (col.a < 0.5) {
        gl_FragColor = vec4(col.rgb, 1.0);
        discard;
    }
    
    float contrast = u_contrast;
    float saturation = u_saturation;
    if(contrast > 0.0)
        contrast = 1.0 / (1.0 - contrast);
    else
        contrast = (1.0 + contrast);

    if(saturation > 0.0)
        saturation = 1.0 / (1.0 - saturation);
    else
        saturation = (1.0 + saturation);
    

    col.rgb = rgb2hsv(col.rgb);
    col.y = clamp(col.y * saturation, 0., 1.);
    col.rgb = hsv2rgb(col.rgb);

    col.rgb = (col.rgb - 0.5) * contrast + u_brightness + 0.5;

    gl_FragColor = vec4(col);
}