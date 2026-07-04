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
    float aChannel = texture2D(tDiffuse, uv).a;
      
    vec3 finalColor = vec3(rChannel, gChannel, bChannel);  
      
    // Add dynamic, high-frequency moving cinema grain emulation
    float grain = fract(sin(dot(uv * (fract(uTime * 0.01) + 1.0), vec2(12.9898, 78.233))) * 43758.5453);  
    finalColor += vec3((grain - 0.5) * 0.07) * aChannel; 
    
    // Apply subtle dark vignette edges mapping to void color
    float dist = distance(uv, vec2(0.5));
    float vignette = smoothstep(0.85, 0.4, dist);
    
    gl_FragColor = vec4(finalColor, aChannel * vignette);  
}
