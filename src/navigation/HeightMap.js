/**
 * @author Karim Barth
 *
 * Height Map encoding:
 *  0 - no data
 *  1 - below -0.5m
 *  2 - 254 - between -0.5m and 2m
 *  255 - above 2m
 */
ROS3D.HeightMap = function(options) {
  options = options || {};

  var message = options.message;
  var info = message.info;

  var origin = info.origin;
  var width = info.width ;
  var height = info.height;
  var data = message.data;


  var planeGeometry = new THREE.PlaneBufferGeometry(width, height, width - 1 , height -1);
  var uintData = new Uint8Array( data );

  var texture = new THREE.DataTexture( uintData, width, height, THREE.RedFormat );
  var uniforms = {
    bumpTexture: { type: 't', value: texture}
  };

  var heightmapVertexShader = `
    uniform sampler2D bumpTexture;
    
    varying float cellHeight;
    
    void main() {
      vec4 bumpData = texture2D( bumpTexture, uv );  
      float scaledData = bumpData.r * 255.0;
      
      if(abs(scaledData) < 0.00001)
        cellHeight = 0.0;
      else if(abs(scaledData - 1.0) < 0.00001)
        cellHeight = -0.5;
      else if (abs(scaledData - 255.0) < 0.00001)
        cellHeight = 2.0;
      else 
        cellHeight = ((scaledData - 2.0) / 252.0) * 2.5 - 0.5;
         
      // move the position along the normal
      vec3 newPosition = position + normal * cellHeight;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
    }
  `;

  var heightmapFragmentShader = `
      varying float cellHeight;
      
      // c.x hue, c.y saturation, c.z value
      vec3 hsv2rgb(vec3 c);
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      void main() {
        float normalizedHeight = (cellHeight + 0.5) / 2.5;
        vec3 hsv = vec3(1.0 - normalizedHeight, 0.95, 0.88);
        
        vec4 heightColor = vec4(hsv2rgb(hsv), 1.0);
        //vec4 heightColor = vec4(normalizedHeight, 0.0, 1.0 -normalizedHeight, 1.0);
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + heightColor;
        
        if( abs(cellHeight) < 0.00001 )
          gl_FragColor.a = 0.0;
      }
  `;

  var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: heightmapVertexShader,
    fragmentShader: heightmapFragmentShader,
    side: THREE.DoubleSide,
  });
  shaderMaterial.transparent = true

  THREE.Mesh.call(this, planeGeometry, shaderMaterial);
  Object.assign(this, options);

  this.material = shaderMaterial;
  this.texture = texture;
  texture.needsUpdate = true;

  this.quaternion.copy(new THREE.Quaternion(
    origin.orientation.x,
    origin.orientation.y,
    origin.orientation.z,
    origin.orientation.w
  ));

  this.position.x = (width * info.resolution) / 2 + origin.position.x;
  this.position.y = (height * info.resolution) / 2 + origin.position.y;
  this.position.z = origin.position.z;
  this.scale.x = info.resolution;
  this.scale.y = info.resolution;

};

ROS3D.HeightMap.prototype.dispose = function() {
  this.material.dispose();
  this.texture.dispose();
};

ROS3D.HeightMap.prototype.__proto__ = THREE.Mesh.prototype;
