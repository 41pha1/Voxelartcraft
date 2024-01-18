precision mediump float;

uniform sampler2D u_targetImage;
uniform sampler2D u_palette;
uniform sampler2D u_textureAtlas;
uniform float u_paletteSize;

uniform vec2 u_textureAtlasSize;

uniform int u_discretize;
uniform int u_applyTexture;

varying vec2 v_texcoord;

vec4 discretize(vec3 c) {
    float minDist = 1000000.0;
    vec3 minCol = vec3(0.0);
    float minIndex = 0.0;

    const float MAX_ITER = 1000.;

    for(float i = 0.; i < MAX_ITER; i++) {
        if(i >= u_paletteSize)
            break;

        vec4 col = texture2D(u_palette, vec2(i / u_paletteSize, 0.5));
        float dist = distance(c, col.rgb);

        if(dist < minDist) {
            minDist = dist;
            minCol = col.rgb;
            minIndex = col.a;
        }
    }

    return vec4(minCol, minIndex);
}

void main() {
    vec2 uv = v_texcoord * 0.5 + 0.5;
    //uv.y = 1.0 - uv.y;

    if (u_paletteSize == 0.0) {
        gl_FragColor = texture2D(u_targetImage, uv);
        return;
    }

    vec4 col = texture2D(u_targetImage, uv); 

    if (u_discretize > 0 && col.a > 0.0){
        vec4 result = discretize(col.rgb);
        col.rgb = result.rgb;

        float textureIndex = floor(result.a);
        float row = floor(mod(textureIndex, 16.0));
        float column = floor(textureIndex / 16.0);

        float pixelIndex = floor(col.a * 255.0);
        float pixelX = floor(mod(pixelIndex, 16.0));
        float pixelY = floor(pixelIndex / 16.0);

        if (u_applyTexture > 0 && col.a > 0.0) {
            vec4 texCol = texture2D(u_textureAtlas, vec2((0.5 + row * 16. + pixelX) / u_textureAtlasSize.x, (0.5 + column * 16. + pixelY) / u_textureAtlasSize.y));


            col.rgb = texCol.rgb;
        }
        //col.rgb *= col.a;

        if (col.a > 0.0)
            col.a  = 1.0;
    }
    gl_FragColor = vec4(col);
}