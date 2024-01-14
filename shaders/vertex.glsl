precision highp float;

attribute vec2 position;
varying vec2 v_texcoord;

void main (void)
{
    v_texcoord = position;
    gl_Position = vec4(position, 0.0, 1.0);
} 