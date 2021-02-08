/**
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * An occupancy grid client that listens to a given map topic.
 *
 * Emits the following events:
 *
 *  * 'change' - there was an update or change in the marker
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the map topic to listen to
 *   * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 *   * tfClient (optional) - the TF client handle to use for a scene node
 *   * compression (optional) - message compression (default: 'cbor')
 *   * rootObject (optional) - the root object to add this marker to
 *   * offsetPose (optional) - offset pose of the grid visualization, e.g. for z-offset (ROSLIB.Pose type)
 *   * color (optional) - color of the visualized grid
 *   * opacity (optional) - opacity of the visualized grid (0.0 == fully transparent, 1.0 == opaque)
 */
ROS3D.HeightMapClient = function(options) {
  EventEmitter2.call(this);
  options = options || {};
  this.ros = options.ros;
  this.topicName = options.topic || '/map';
  this.compression = options.compression || 'cbor';
  this.tfClient = options.tfClient;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.offsetPose = options.offsetPose || new ROSLIB.Pose();
  this.heightScale = options.heightScale || 0.01;
  this.minHeight = options.minHeight || -128.0;
  this.maxHeight = options.maxHeight || 127.0;

  // current grid that is displayed
  this.currentHeightMap = null;

  // subscribe to the topic
  this.rosTopic = undefined;
  this.subscribe();
};
ROS3D.HeightMapClient.prototype.__proto__ = EventEmitter2.prototype;

ROS3D.HeightMapClient.prototype.unsubscribe = function(){
  if(this.rosTopic){
    this.rosTopic.unsubscribe();
  }
};

ROS3D.HeightMapClient.prototype.subscribe = function(){
  this.unsubscribe();

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
    ros : this.ros,
    name : this.topicName,
    messageType : 'nav_msgs/OccupancyGrid',
    queue_length : 1,
    compression : this.compression
  });
  this.sceneNode = null;
  this.rosTopic.subscribe(this.processMessage.bind(this));
};

ROS3D.HeightMapClient.prototype.processMessage = function(message){
  // check for an old map
  if (this.currentHeightMap) {
    // check if it there is a tf client
    if (this.currentHeightMap.tfClient) {
      // grid is of type ROS3D.SceneNode
      this.currentHeightMap.unsubscribeTf();
    }
    if(this.sceneNode){
      this.sceneNode.remove(this.currentHeightMap);
    }
    this.currentHeightMap.dispose();
  }

  var newHeightMap = new ROS3D.HeightMap({
    message : message,
    heightScale: this.heightScale,
    minHeight: this.minHeight,
    maxHeight: this.maxHeight,
  });

  // check if we care about the scene
  if (this.tfClient) {
    this.currentHeightMap = newHeightMap;
    if (this.sceneNode === null) {
      this.sceneNode = new ROS3D.SceneNode({
        frameID : message.header.frame_id,
        tfClient : this.tfClient,
        object : newHeightMap,
        pose : this.offsetPose
      });
      this.rootObject.add(this.sceneNode);
    } else {
      this.sceneNode.add(this.currentHeightMap);
    }
  } else {
    this.sceneNode = this.currentHeightMap = newHeightMap;
    this.rootObject.add(this.currentHeightMap);
  }

  this.emit('change');

};
