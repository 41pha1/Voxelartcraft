precision mediump float;

uniform float u_depth;
uniform float u_depthStep;
uniform float u_aspect;
uniform float u_maxDepth;

uniform vec2 u_resolution;
uniform vec3 u_camPos;
uniform float u_fov;
uniform float u_pitch;
uniform float u_yaw;
uniform float u_roll;

uniform mat4 u_projection;
uniform mat4 u_view;

uniform float u_pixelArtMode;

uniform sampler2D u_alphaMask;

varying vec2 v_texcoord;


const float PI = 3.1415926535897932384626433832795;

vec3 checkAlphaOffsets[15];
vec2 pixelOffsets[4];

vec3 planeIntersect(vec3 p0, vec3 pn, vec3 r0, vec3 ray)
{
    float denom = dot(pn, ray);
    
    vec3 p0l0 = p0 - r0;
    float t = dot(p0l0, pn) / denom; 
    return r0 + t * ray;
}

vec2 blockUV(vec3 cube, vec3 origin, vec3 dir, vec3 face)
{
    dir = normalize(dir);
    face = normalize(face);
    vec3 faceMiddle = cube + face * 0.5;
    vec3 intersect = planeIntersect(faceMiddle, face, origin, dir);

    intersect = fract(intersect);
    
    if(abs(face.x) > 0.5)
        return vec2(intersect.y, intersect.z);
    
    if(abs(face.y) > 0.5)
        return vec2(intersect.x, intersect.z);
        
    if(abs(face.z) > 0.5)
        return vec2(intersect.y, intersect.x);
}

float manhatten(vec3 pos1, vec3 pos2)
{
    return abs(pos1.x - pos2.x) + abs(pos1.y - pos2.y) + abs(pos1.z - pos2.z);
}

float cameraPlaneDist(vec3 pos, vec3 cameraPos, vec3 cameraForward)
{   
    vec3 a = pos - cameraPos;
    float b = distance(dot(a, cameraForward) * cameraForward, vec3(0.));

    return b;
}

float dist(vec3 pos1, vec3 pos2, vec3 cameraForward)
{
  if (u_pixelArtMode > 0.5)
      return cameraPlaneDist(pos1, pos2, cameraForward);
  else
      return manhatten(pos1, pos2);
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

float intbound(float s, float ds) {
  // Find the smallest positive t such that s+t*ds is an integer.
  if (ds < 0.) {
    s = mod(-s, 1.);
    return (1.-s)/(-ds);
  } else {
    s = mod(s, 1.);
    return (1.-s)/ds;
  }
}

float startingEstimate(vec3 dir, float depth)
{
    vec3 p0 = vec3(0., 0., depth * sign(dir.z));
    vec3 pn = sign(dir); 
    vec3 inter = planeIntersect(p0, pn, vec3(0.), dir);
    
    return length(inter) - 2.0;
}


mat3 raycast(vec3 origin, vec3 direction, mat4 viewProjection, float depth, vec3 forward) {
  // From "A Fast Voxel Traversal Algorithm for Ray Tracing"
  // by John Amanatides and Andrew Woo, 1987
  // <http://www.cse.yorku.ca/~amana/research/grid.pdf>
  // <http://citeseer.ist.psu.edu/viewdoc/summary?doi=10.1.1.42.3443>
  // Extensions to the described algorithm:
  //   • Imposed a distance limit.
  //   • The face passed through to reach the current cube is provided to
  //     the callback.

  // The foundation of this algorithm is a parameterized representation of
  // the provided ray,
  //                    origin + t * direction,
  // except that t is not actually stored; rather, at any given point in the
  // traversal, we keep track of the *greater* t values which we would have
  // if we took a step sufficient to cross a cube boundary along that axis
  // (i.e. change the integer part of the coordinate) in the variables
  // tMaxX, tMaxY, and tMaxZ.

  // Cube containing origin point.
  vec3 estimOrig = origin + startingEstimate(direction, depth) * direction;
  vec3 cube = floor(estimOrig);
  // Direction to increment x,y,z when stepping.
  vec3 rayStep = sign(direction);
  // See description above. The initial values depend on the fractional
  // part of the origin.
  float tMaxX = intbound(estimOrig.x, direction.x);
  float tMaxY = intbound(estimOrig.y, direction.y);
  float tMaxZ = intbound(estimOrig.z, direction.z);
  // The change in t when taking a step (always positive).
  vec3 tDelta = rayStep / direction;
  // Buffer for reporting faces to the callback.
  vec3 face = vec3(0.);

  // Rescale from units of 1 cube-edge to units of 'direction' so we can
  // compare with 't'.
  for(float i = 0.; i < 1000.; i += 1.) {
    // Invoke the callback, unless we are not *yet* within the bounds of the
    // world.
    vec3 block = cube + vec3(0.5);   
    float d = dist(block, origin, forward);

    if(d > depth){
       return mat3(block, cube, face);
    }

    // tMaxX stores the t-value at which we cross a cube boundary along the
    // X axis, and similarly for Y and Z. Therefore, choosing the least tMax
    // chooses the closest cube boundary. Only the first case of the four
    // has been commented in detail.
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        // Update which cube we are now in.
        cube.x += rayStep.x;
        // Adjust tMaxX to the next X-oriented boundary crossing.
        tMaxX += tDelta.x;
        // Record the normal vector of the cube face we entered.
        face = vec3(-rayStep.x, 0., 0.);
      } else {
        cube.z += rayStep.z;
        tMaxZ += tDelta.z;
        face = vec3(0., 0., -rayStep.z);
      }
    } else {
      if (tMaxY < tMaxZ) {
        cube.y += rayStep.y;
        tMaxY += tDelta.y;
        face = vec3(0., -rayStep.y, 0.);
      } else {
        // Identical to the second case, repeated for simplicity in
        // the conditionals.
        cube.z += rayStep.z;
        tMaxZ += tDelta.z;
        face = vec3(0., 0., -rayStep.z);
      }
    }
  }
}

void main( )
{
    // offsets
    checkAlphaOffsets[0] = vec3(0., 0., 0.);
    checkAlphaOffsets[1] = vec3(1., 0., 0.);
    checkAlphaOffsets[2] = vec3(0., 1., 0.);
    checkAlphaOffsets[3] = vec3(1., 1., 0.);
    checkAlphaOffsets[4] = vec3(0., 0., 1.);
    checkAlphaOffsets[5] = vec3(1., 0., 1.);
    checkAlphaOffsets[6] = vec3(0., 1., 1.);
    checkAlphaOffsets[7] = vec3(1., 1., 1.);
    checkAlphaOffsets[8] = vec3(0.5, 0.5, 0.5);
    checkAlphaOffsets[9] = vec3(0.5, 0.5, 0.);
    checkAlphaOffsets[10] = vec3(0.5, 0., 0.5);
    checkAlphaOffsets[11] = vec3(0., 0.5, 0.5);
    checkAlphaOffsets[12] = vec3(0.5, 0.5, 1.);
    checkAlphaOffsets[13] = vec3(0.5, 1., 0.5);
    checkAlphaOffsets[14] = vec3(1., 0.5, 0.5);
    
    float pixelScale = 0.;
    pixelOffsets[0] = vec2(-0.5 * pixelScale, -0.5 * pixelScale);
    pixelOffsets[1] = vec2(-0.5 * pixelScale, 0.5 * pixelScale);
    pixelOffsets[2] = vec2(0.5 * pixelScale, -0.5 * pixelScale);
    pixelOffsets[3] = vec2(0.5 * pixelScale, 0.5 * pixelScale);
    
    //settings
    float depth = u_depth;
    float depthStep = u_depthStep;
    
    // camera
    vec2 uv = v_texcoord;
    uv = uv * 0.5 + 0.5;
    uv *= (u_resolution.xy - 1.) / (u_resolution.xy);
    uv = uv * 2. - 1.;
    uv += 0.5 / u_resolution.xy;
    uv.x *= u_aspect;
    //uv.y *= -1.;

    // vec4 alpha = texture2D(u_alphaMask, uv);

    // if(alpha.a < 0.5){
    //     gl_FragColor = vec4(0.);
    //     return;
    // }

    float fov = u_fov * PI / 180.;
    float pitch = u_pitch * PI / 180.;
    float yaw = u_yaw * PI / 180.;
    float roll = u_roll * PI / 180.;

    float zoom = 1. / tan(fov / 2.);
    vec3 cameraPos = u_camPos;
    vec3 lookingAt = cameraPos + vec3(
        cos(pitch) * sin(yaw),
        sin(pitch),
        cos(pitch) * cos(yaw)
    );

    mat4 viewProjection = u_projection * u_view;
    vec3 forward = normalize(lookingAt - cameraPos);
    vec3 globalup = vec3(0., 1., 0.);

    vec3 right = normalize(cross(forward, globalup));
    vec3 up = normalize(cross(forward, right));

    // Apply Roll
    right = (cos(roll) * right + sin(roll) * up);
    up = cross(forward, right);

    vec3 rayOrigin = cameraPos;// + rayDirection * (depth - 3.0);
    vec3 rayDirection = vec3(0.);
    
    mat3 result = mat3(0.);

    if (u_pixelArtMode > 0.5)
    {
        vec2 pixelUV = uv + pixelOffsets[0] / u_resolution.xy;
        rayDirection = normalize(pixelUV.x * right + pixelUV.y * up + forward * zoom);

        result = raycast(rayOrigin, rayDirection, viewProjection, depth, forward);

    }else {
      for (int i = 0; i < 4; i ++) {
        vec2 pixelUV = uv + pixelOffsets[i] / u_resolution.xy;
        rayDirection = normalize(pixelUV.x * right + pixelUV.y * up + forward * zoom);

        mat3 nextResult = raycast(rayOrigin, rayDirection, viewProjection, depth, forward);
        
        if (i > 0 && nextResult[0] != result[0])
        {
            gl_FragColor = vec4(0.);
            return;
        }
        result = nextResult;
      }
    }
   
    
    vec3 block = result[0];
    vec3 cube = result[1];
    vec3 face = result[2];

    // sphere cut off
    if (distance(block, cameraPos) > u_maxDepth + 2. && u_pixelArtMode < 0.5)
    {
        gl_FragColor = vec4(0.);
        return;
    }
    if (!blockOverlapsAlpha(cube, viewProjection))
    {
        float shade = 1.;

        if (sign(face.x) < 0.)
            shade = 2.;
        else if (sign(face.y) > 0.)
            shade = 4.;
        else if (sign(face.y) < 0.)
            shade = 1.;
        else if (sign(face.z) > 0.)
            shade = 3.;
        else if (sign(face.z) < 0.)
            shade = 3.;
        
        vec2 uv = blockUV(block, rayOrigin, rayDirection, face);      
        float pixel = floor(uv.x * 16.) * 16. + floor(uv.y * 16.);
        float alpha = 1. + pixel + shade * 256.;

        gl_FragColor = vec4(cube , alpha);
    }
    else {
        gl_FragColor =  vec4(0.);
    }
}