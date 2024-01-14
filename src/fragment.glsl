uniform float u_depth;
uniform float u_depthStep;
uniform float u_aspect;

uniform vec3 u_camPos;
uniform float u_fov;
uniform float u_pitch;
uniform float u_yaw;

uniform mat4 u_projection;
uniform mat4 u_view;

uniform sampler2D u_alphaMask;

varying vec2 v_texcoord;

const float PI = 3.1415926535897932384626433832795;
const vec3 checkAlphaOffsets[15] = vec3[15](
    vec3(0., 0., 0.),
    vec3(1., 0., 0.),
    vec3(0., 1., 0.),
    vec3(1., 1., 0.),
    vec3(0., 0., 1.),
    vec3(1., 0., 1.),
    vec3(0., 1., 1.),
    vec3(1., 1., 1.),
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.),
    vec3(0.5, 0., 0.5),
    vec3(0., 0.5, 0.5),
    vec3(0.5, 0.5, 1.),
    vec3(0.5, 1., 0.5),
    vec3(1., 0.5, 0.5)
);

bool correctDistance(vec3 blockPos, vec3 cameraPos, float depth, float depthStep)
{
    float d = distance(blockPos, cameraPos);
    return d > depth && d < depth + depthStep;
}

bool isOccluded(vec3 currentBlock, vec3 cameraPos, float d, float depth, float depthStep)
{
    if(d > depth + depthStep)
        return true;

    vec3 up = vec3(0., 1., 0.);
    vec3 right = vec3(1., 0., 0.);
    vec3 forward = vec3(0., 0., 1.);

    if(correctDistance(currentBlock + up, cameraPos, depth, depthStep))
        if (distance(currentBlock + up, cameraPos) < d)
            return true;
    if(correctDistance(currentBlock - up, cameraPos, depth, depthStep))
        if (distance(currentBlock - up, cameraPos) < d)
            return true;
    if(correctDistance(currentBlock + right, cameraPos, depth, depthStep))
        if (distance(currentBlock + right, cameraPos) < d)
            return true;
    if(correctDistance(currentBlock - right, cameraPos, depth, depthStep))
        if (distance(currentBlock - right, cameraPos) < d)
            return true;
    if(correctDistance(currentBlock + forward, cameraPos, depth, depthStep))
        if (distance(currentBlock + forward, cameraPos) < d)
            return true;
    if(correctDistance(currentBlock - forward, cameraPos, depth, depthStep))
        if (distance(currentBlock - forward, cameraPos) < d)
            return true;

    return false;
}

vec2 worldToUV(vec3 worldPos, mat4 viewProjection)
{
    vec4 pos = viewProjection * vec4(worldPos, 1.);
    pos /= pos.w;
    pos.y *= -1.;
    return pos.xy * 0.5 + 0.5;

}

bool blockOverlapsAlpha(vec3 currentBlock, mat4 viewProjection)
{
    for (int i = 0; i < 15; i++)
    {
        vec3 blockPos = currentBlock + checkAlphaOffsets[i];
        vec2 uv = worldToUV(blockPos, viewProjection);

        if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.)
            return true;

        vec4 alpha = texture2D(u_alphaMask, uv);
        if(alpha.a < 0.5)
            return true;
    }

    return false;
}

float disToPlane(vec3 normal, vec3 pos)
{
    return abs(normal.x * pos.x + normal.y * pos.y + normal.z * pos.z);
}

void main()
{
    //settings
    float depth = u_depth;
    float depthStep = u_depthStep;
    
    // camera
    vec2 uv = v_texcoord;
    uv.x *= u_aspect;

    float fov = u_fov * PI / 180.;
    float pitch = u_pitch * PI / 180.;
    float yaw = u_yaw * PI / 180.;

    float zoom = 1. / tan(fov / 2.);
    vec3 cameraPos = u_camPos;
    vec3 lookingAt = cameraPos + vec3(
        cos(pitch) * sin(yaw),
        sin(pitch),
        cos(pitch) * cos(yaw)
    );

    mat4 viewProjection = u_projection * u_view;
    
    vec3 globalup = vec3(0., 1., 0.);
    vec3 forward = normalize(lookingAt - cameraPos);
    vec3 right = normalize(cross(forward, globalup));
    vec3 up = normalize(cross(forward, right));

    vec3 rayDirection = normalize(uv.x * right + uv.y * up + forward * zoom);
    vec3 rayOrigin = cameraPos + rayDirection * (depth - 3.0);

    gl_FragColor = texture2D(u_alphaMask, v_texcoord * 0.5 + 0.5);

    //raytracing
    vec3 currentBlock = floor(rayOrigin);
    vec3 faceNormal = vec3(0.0);
    vec4 col = vec4(0.);

    for (float i = 0.; i < 10.; i++){
        vec3 posInCube = fract(abs(rayOrigin));
        vec3 ttb = (1.-posInCube) / abs(rayDirection);

        if(ttb.x < ttb.y && ttb.x < ttb.z){
            rayOrigin += rayDirection * ttb.x;
            faceNormal = vec3(-sign(rayDirection.x), 0., 0.);

        }else if(ttb.y < ttb.z){
            rayOrigin += rayDirection * ttb.y;
            faceNormal = vec3(0., -sign(rayDirection.y), 0.);

        }else {
            rayOrigin += rayDirection * ttb.z;
            faceNormal = vec3(0., 0., -sign(rayDirection.z));
        }

        currentBlock = floor(rayOrigin + 0.5 * faceNormal);
        
        float d = distance(currentBlock, cameraPos);
        if(d > depth){
            if(isOccluded(currentBlock, cameraPos, d, depth, depthStep))
                break;
            
            if (blockOverlapsAlpha(currentBlock, viewProjection))
                break;

            float normalCompress = abs(faceNormal.x) * 1. + abs(faceNormal.y) * 0.6 + abs(faceNormal.z) * 0.8;

            col = vec4(currentBlock, normalCompress);
            break;
        }
    }

    // Output to screen
    gl_FragColor = vec4(col);
}