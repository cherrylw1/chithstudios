uniform float uTime;
uniform float uSolidifyProgress;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Compute reflection vector in view space
    vec3 reflectDir = reflect(-viewDir, normal);
    
    // Procedural environment map reflections (chrome sheen)
    float envLight = sin(reflectDir.x * 4.0 + uTime * 0.5) * cos(reflectDir.y * 4.0 + uTime * 0.5) * 0.5 + 0.5;
    float envHighlight = pow(max(reflectDir.z, 0.0), 16.0);
    
    // Core palette tones mapped to highlights
    vec3 voidColor = vec3(0.039, 0.043, 0.055);  // #0A0B0E
    vec3 boneColor = vec3(0.98, 0.978, 0.965);    // #FAF9F6
    vec3 voltColor = vec3(0.831, 1.000, 0.000);  // #D4FF00
    
    // Metallic color bands (anisotropic liquid metal reflection style)
    float bands = sin(reflectDir.y * 10.0 + reflectDir.x * 5.0 + uTime * 0.2) * 0.5 + 0.5;
    vec3 metalSheen = mix(voidColor, boneColor, bands);
    
    // Add specular neon volt glow reflections
    metalSheen = mix(metalSheen, voltColor, envHighlight * 0.7);
    
    // Fresnel rim light reflection for a glassy border
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    vec3 finalChrome = mix(metalSheen, boneColor, fresnel * 0.5);
    
    // Add bright specular glints
    finalChrome += vec3(pow(envHighlight, 3.0) * 0.8);
    
    // Solidify transition based on progress (scale opacity / visibility)
    gl_FragColor = vec4(finalChrome, uSolidifyProgress * 0.95);
}
