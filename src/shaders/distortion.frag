uniform sampler2D tDiffuse;  
uniform float uScrollVelocity;  
uniform float uTime;  
varying vec2 vUv;

void main() {  
    vec2 uv = vUv;  
      
    // Create organic screen-edge barrel distortion based on scroll velocity  
    vec2 distortionOffset = (uv - 0.5) * uScrollVelocity * 0.12;  
      
    // Split RGB color channels based on kinetic momentum (The Chith Head-Rush Effect)  
    float rChannel = texture2D(tDiffuse, uv + distortionOffset).r;  
    float gChannel = texture2D(tDiffuse, uv).g;  
    float bChannel = texture2D(tDiffuse, uv - distortionOffset).b;  
      
    // Add subtle, high-frequency late-night cinema grain emulation  
    float grain = fract(sin(dot(uv ,vec2(12.9898,78.233))) * 43758.5453);  
    vec3 finalColor = vec3(rChannel, gChannel, bChannel);  
    finalColor += vec3(grain * 0.035);  
      
    gl_FragColor = vec4(finalColor, 1.0);  
}
