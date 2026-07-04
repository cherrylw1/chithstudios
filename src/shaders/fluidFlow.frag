uniform float uTime;
varying vec2 vUv;

// Simple 2D noise generator
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; ++i) {
        v += a * noise(p);
        p = rot * p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = vUv;
    
    // Create animated warp/distortion vectors (plasma-like flow)
    vec2 q = vec2(
        fbm(uv + vec2(0.0, 0.0) + vec2(uTime * 0.2, uTime * 0.1)),
        fbm(uv + vec2(1.0, 1.0) + vec2(uTime * 0.15, uTime * 0.2))
    );
    
    vec2 r = vec2(
        fbm(uv + 4.0 * q + vec2(uTime * 0.25, uTime * 0.05)),
        fbm(uv + 4.0 * q + vec2(uTime * 0.08, uTime * 0.3))
    );
    
    float f = fbm(uv + 4.0 * r);
    
    // Core palette colors
    vec3 voltColor = vec3(0.831, 1.000, 0.000);  // #D4FF00
    vec3 voidColor = vec3(0.039, 0.043, 0.055);  // #0A0B0E
    vec3 bruiseColor = vec3(0.110, 0.086, 0.180); // #1C162E
    
    // Marbled flow color mix
    vec3 color = mix(voidColor, bruiseColor, f * 0.6);
    color = mix(color, voltColor, pow(f, 2.5) * 1.3); // High voltage bright areas
    
    // Soft transparent edge fade
    float edgeFade = smoothstep(0.0, 0.25, uv.x) * smoothstep(1.0, 0.75, uv.x);
    
    gl_FragColor = vec4(color, edgeFade * 0.9);
}
