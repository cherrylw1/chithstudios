uniform float uTime;  
uniform vec2 uMouseVelocity;  
varying vec3 vNormal;  
varying vec3 vViewPosition;

void main() {  
    vec3 normal = normalize(vNormal);  
    vec3 viewDir = normalize(vViewPosition);  
      
    // Calculate Fresnel refraction to map heavy glass borders  
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.5);  
      
    // Base Colors mapped directly from taste.md  
    vec3 voidColor = vec3(0.039, 0.043, 0.055);  // #0A0B0E  
    vec3 voltColor = vec3(0.831, 1.000, 0.000);  // #D4FF00  
    vec3 bruiseColor = vec3(0.110, 0.086, 0.180); // #1C162E  
      
    // Mutate the glass refraction based on rapid mouse actions  
    vec3 mixShadow = mix(voidColor, bruiseColor, normal.z);  
    vec3 finalGlass = mix(mixShadow, voltColor, fresnel * (1.0 + length(uMouseVelocity) * 3.0));  
      
    gl_FragColor = vec4(finalGlass, 0.95);  
}
