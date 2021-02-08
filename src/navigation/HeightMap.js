/**
 * @author Karim Barth
 */

ROS3D.HeightMap = function(options) {
  options = options || {};
  var minHeight = options.minHeight || -128.0;
  var maxHeight = options.maxHeight || 127.0;

  var message = options.message;
  var info = message.info;

  var origin = info.origin;
  var width = info.width ;
  var height = info.height;
  var data = message.data;


  var planeGeometry = new THREE.PlaneGeometry(width, height, width - 1 , height -1);
  var uintData = new Uint8Array( data.map(value => value + 128) );

  var texture = new THREE.DataTexture( uintData, width, height, THREE.RedFormat );
  var uniforms = {
    bumpTexture: { type: 't', value: texture},
    bumpScale: { type: 'f', value: 0.01 },
    minHeight: { type: 'f', value: minHeight },
    maxHeight: { type: 'f', value: maxHeight },
  };

  var heightmapVertexShader = `
    uniform sampler2D bumpTexture;
    uniform float bumpScale;
    uniform float minHeight;
    uniform float maxHeight;
    
    varying float cellHeight;
    
    void main() {
      vec4 bumpData = texture2D( bumpTexture, uv );  
      cellHeight = clamp((bumpData.r * 255.0)-128.0, minHeight, maxHeight);
      // move the position along the normal
      vec3 newPosition = position + normal * bumpScale * cellHeight;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
    }
  `;

  var heightmapFragmentShader = `
      uniform float minHeight;
      uniform float maxHeight;
      
      varying float cellHeight;

      void main() {
        float normalizedHeight = (cellHeight - minHeight)/(maxHeight - minHeight);
        vec4 heightColor = vec4(normalizedHeight, 0.0, 1.0 -normalizedHeight, 1.0);
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + heightColor;
      }
  `;

  var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: heightmapVertexShader,
    fragmentShader: heightmapFragmentShader,
    side: THREE.DoubleSide,
  });

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
