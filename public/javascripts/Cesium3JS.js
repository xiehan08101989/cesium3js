
class CesiumTool{
    /*
    options = {
      useDefaultRenderLoop: false,
      selectionIndicator : false,
      homeButton:false,
      sceneModePicker:false,
      navigationHelpButton:false,
      infoBox : false,
      navigationInstructionsInitiallyVisible:false,
      animation : false,
      timeline : false,
      fullscreenButton : false,
      allowTextureFilterAnisotropic:false,
        targetFrameRate:60,
        resolutionScale:0.1,
        orderIndependentTranslucency : true,
        //imageryProvider : initialMap,
        baseLayerPicker : false,
        geocoder : false,
        automaticallyTrackDataSourceClocks: false,
        dataSources: null,
        clock: null,
    }
    * */
    static initCesiumViewer(id,ioptions){
        if(!id){
            console.error('cesium canvas must be exist');
            return null;
        }
        let options = ioptions;
        if(!options){
            options = {
                useDefaultRenderLoop: false,
                selectionIndicator : false,
                homeButton:false,
                sceneModePicker:false,
                navigationHelpButton:false,
                infoBox : false,
                navigationInstructionsInitiallyVisible:false,
                animation : false,
                timeline : false,
                fullscreenButton : false,
                allowTextureFilterAnisotropic:false,
                targetFrameRate:60,
                resolutionScale:0.1,
                orderIndependentTranslucency : true,
                //imageryProvider : initialMap,
                baseLayerPicker : false,
                geocoder : false,
                automaticallyTrackDataSourceClocks: false,
                dataSources: null,
                clock: null,
                /*contextOptions: {
                    requestWebgl2: true,
                    anialias:true,
                },*/
            };
        }
        options.imageryProvider = new Cesium.UrlTemplateImageryProvider({
            url:'http://mt1.google.cn/vt/lyrs=s&hl=zh-CN&x={x}&y={y}&z={z}&s=Gali',
            minimumLevel:0,
            maximumLevel:21,
        });
        return new Cesium.Viewer(id,options);
    }

    /*

    options = {

    }
    * */
    static initSceneConfig(iviewer){
        let viewer = iviewer||window.viewer;
        viewer._cesiumWidget._creditContainer.style.display="none";
        //扩展帧率控制器
        viewer.scene.debugShowFramesPerSecond = true;
        //渲染加速测试
        //window.viewer.scene.postProcessStages.ambientOcclusion=false;
        //开启深度检测
        viewer.scene.globe.depthTestAgainstTerrain = true;//要实现只贴3dtiles必须关闭深度检测
        //对数深度关掉
        //console.log(window.viewer.scene.logarithmicDepthBuffer);
        //console.log(window.viewer.scene.postProcessStages.fxaa.enabled);
        viewer.scene.logarithmicDepthBuffer = true; //对数深度关掉试试，在室内视角不会丢失底部纹理
        //取消参数
        viewer.scene.postProcessStages.fxaa.enabled = true;
        viewer.scene.highDynamicRange = false;
        //window.viewer.scene.globe.maximumScreenSpaceError= 0.7;//值越大越模糊
        //window.viewer.resolutionScale=1.2;//整个界面分辨率

        viewer.scene.skyBox.show = true;
        viewer.scene.sun.show = false;
        viewer.scene.moon.show = false;
        viewer.scene.fog.enabled = false;
        viewer.scene.globe.enableLighting = false;//光照
        viewer.scene.skyAtmosphere.show = false;
    }
    constructor(options){

    }
}

class ThreeTool{
    /*
    options = {
        fov:45,
        rate:1.,
        width:window.innerWidth,
        height:window.innerHeight,
        aspect:width/height,
        near:1.,
        far:10000000,
    }
    * */
    static initThreeViewer(threecontainer,options){
        let fov = options.fov||45;
        let aspect = options.aspect||1.;
        let near = options.near||1.;
        let far = options.far||10000000;
        let rendererOptions = {
          alpha:true,
          antialias:true,
        };

        let three =  {
            scene: new THREE.Scene(),
            camera:new THREE.PerspectiveCamera(fov,aspect,near,far),
            renderer:new THREE.WebGLRenderer(rendererOptions),
        };
        threecontainer.appendChild(three.renderer.domElement);
        three.renderer.setClearColor(0x000000,0);
        return three;
    }
}
//CesiumThree基本几何体参数
class MyThreeGeometry{
    constructor(options){
        this.maxExtent = [116.23,41.55];
        this.center = options.center;//经纬度高度坐标
        this.id = 'obj'+Math.random() +new Date().getTime();
        this.centerCart = Cesium.Cartesian3.fromDegrees(this.center[0],this.center[1],this.center[2]);
        this.centerHigh = Cesium.Cartesian3.fromDegrees(this.center[0],this.center[1],this.center[2] + 1);
        this.mesh = null;
        this.setObj2Center();
    }

    setObj2Center(){
        let bl = this.cart2Vec(this.centerCart);
        let tl = this.cart2Vec(Cesium.Cartesian3.fromDegrees(this.center[0],this.maxExtent[1],this.center[2]));
        this.latDir = new THREE.Vector3().subVectors(bl , tl).normalize();
    }

    update(){
        if(this.mesh) {
            //console.log('geometry update',this.centerCart);
            this.mesh.position.copy(this.centerCart);
            this.mesh.lookAt(this.centerHigh);
            this.mesh.up.copy(this.latDir);
        }
    }

    cart2Vec(p){
        return new THREE.Vector3(p.x,p.y,p.z);
    }

}
//CesiumThree立方体
/*
{
    center:
    plane:
    color:
}
* */
class MyThreeCube extends MyThreeGeometry{
    constructor(options){
        super(options);
        this.cube = options.geometry;
        this.color = options.color||0xffff00;
        this.material = options.material;

        this.draw();
    }

    draw(){
        this.mesh = new THREE.Group();

        let plane = new THREE.CubeGeometry(1,1,1);
        let material = new THREE.MeshNormalMaterial({
            //color:this.color,
            vertexColors: THREE.VertexColors,
        });
        let planemesh = new THREE.Mesh(plane,material);
        planemesh.scale.set(this.cube[0],this.cube[1],this.cube[2]);
        planemesh.position.x -=  this.cube[0]/2;
        planemesh.position.y -=  this.cube[2]/2;
        planemesh.position.z +=  this.cube[1]/2 ;
        planemesh.rotation.x = Math.PI/2 ;
        this.mesh.add(planemesh);
        //window.three.scene.add(this.mesh);
        //this.update();
    }
}
//绘制turf宽度线
class MyThreeLine1 extends MyThreeGeometry{
    constructor(options) {
        super(options);
        this.controlPoints = options.geometry;

    }

}
//绘制宽度line
class MyThreeLine extends MyThreeGeometry{
    constructor(options){
        super(options);
        this.line = options.geometry;
        this.color = options.color||0xffff00;
        this.material = options.material;

        this.draw();
    }

    draw(){
        this.mesh = new THREE.Group();

        let geometry = new THREE.Geometry();
        geometry.vertices.push(
            new THREE.Vector3(-100, 0, 0),
            new THREE.Vector3(100, 0, 0)
        );
        geometry.colors.push(
            new THREE.Color( 0x444444 ),
            new THREE.Color( 0xFF0000 )
        );
        let line = new MeshLine();
        line.setGeometry(geometry);
        let  resolution = new THREE.Vector2( window.innerWidth, window.innerHeight );
        let material = new MeshLineMaterial( {
            useMap: false,
            color: new THREE.Color( 0xed6a5a ),
            opacity: 1,
            resolution: resolution,
            sizeAttenuation: true,
            lineWidth: 5,
            near: 1,
            far: 1,
            depthWrite: true,
        });
        let lineMesh = new THREE.Mesh(line.geometry, material);
        lineMesh.rotation.x = Math.PI/2;
        this.mesh.add(lineMesh);
        //window.three.scene.add(this.mesh);
        //this.update();
    }
}
//加载obj模型
class MyThreeObj{
    constructor(options){
        //this.c3js = options.c3js;
        this.url1 = options.mtlurl;
        this.url2 = options.objurl;
        this.center = options.center;//经纬度高度坐标

        this.maxExtent = [116.23,41.55];

        this.id = 'obj'+Math.random() +new Date().getTime();

        this.centerCart = Cesium.Cartesian3.fromDegrees(this.center[0],this.center[1],this.center[2]);
        this.centerHigh = Cesium.Cartesian3.fromDegrees(this.center[0],this.center[1],this.center[2] + 1);
        this.draw();
    }

    draw(){
        let self = this;
        this.setObj2Center();
        let material = new THREE.MeshNormalMaterial({
            color: 0xffffff,
            //vertexColors: THREE.VertexColors, //以顶点颜色为准
            side: THREE.DoubleSide, //两面可见
            //wireframe :true,
        });
        _3MTL.load(self.url1, function(materials) {
            // 返回一个包含材质的对象MaterialCreator
            //console.log(materials);
            materials.preload();
            //obj的模型会和MaterialCreator包含的材质对应起来
            _3OBJ.setMaterials(materials);
            _3OBJ.load(self.url2, function(obj) {
                obj.children.forEach(function (child) {
                    //child.scale.set(2,2,2);
                    child.rotation.x = Math.PI / 2;
                    child.position.y -= 0;
                    child.position.z += 223 ;
                    child.material = material;//object3D对象的子对象网格模型赋予材质对象
                });
                self.mesh = obj;
                //console.log(self.mesh.position);
                //console.log(self.mesh.up);
                //==================================================
                window.three.scene.add(self.mesh);
                self.update();
                console.log('obj is loaded');
            },function(){

            },function(err){
                console.error(err);
            })
        });

    }

    setObj2Center(){
        let bl = this.cart2Vec(this.centerCart);
        let tl = this.cart2Vec(Cesium.Cartesian3.fromDegrees(this.center[0],this.maxExtent[1],this.center[2]));
        this.latDir = new THREE.Vector3().subVectors(bl , tl).normalize();
    }

    update(){
        if(this.mesh) {
            //console.log('obj update');
            this.mesh.position.copy(this.centerCart);
            this.mesh.lookAt(this.centerHigh);
            this.mesh.up.copy(this.latDir);
        }
    }

    cart2Vec(p){
        return new THREE.Vector3(p.x,p.y,p.z);
    }

    destroyObj(){
        window.three.scene.remove(this.mesh);
    }

    destroy(){
        this.destroyObj();
        for(let i in this){
            delete this[i];
        }
    }
}

class Cesium3JS{
    constructor(options){
        this.minExtent = options.minExtent;
        this.maxExtent = options.maxExtent;
        this.threeObjects = {};
    }

    initCesium(id,options){
        window.viewer = CesiumTool.initCesiumViewer(id,options);
        CesiumTool.initSceneConfig(window.viewer);
    }

    initThree(id,options){
        window.three = ThreeTool.initThreeViewer(id,options||{});
    }
    init(cesiumid,options,threeid,options1){
        this.initCesium(cesiumid,options);
        this.initThree(threeid,options1);
    }

    add(object){
        if(object) {
            this.threeObjects[object.id] = object;
            if(object.mesh) {
                window.three.scene.add(object.mesh);
            }
        }
    }

    remove(object){
        if(object) {
            if(object.mesh)
                window.three.scene.remove(object.mesh);
            delete this.threeObjects[object.id] ;
        }
    }

    renderThreeAndObj(){
        window.three.camera.fov = Cesium.Math.toDegrees(window.viewer.camera.frustum.fovy); // ThreeJS FOV is vertical
        //window.three.camera.updateProjectionMatrix();
        //更新模型位置
        for(let i in this.threeObjects){
            this.threeObjects[i].update();
        }
        window.three.camera.matrixAutoUpdate = false;
        var cvm = window.viewer.camera.viewMatrix;
        var civm = window.viewer.camera.inverseViewMatrix;
        window.three.camera.matrixWorld.set(
            civm[0], civm[4], civm[8 ], civm[12],
            civm[1], civm[5], civm[9 ], civm[13],
            civm[2], civm[6], civm[10], civm[14],
            civm[3], civm[7], civm[11], civm[15]
        );
        window.three.camera.matrixWorldInverse.set(
            cvm[0], cvm[4], cvm[8 ], cvm[12],
            cvm[1], cvm[5], cvm[9 ], cvm[13],
            cvm[2], cvm[6], cvm[10], cvm[14],
            cvm[3], cvm[7], cvm[11], cvm[15]
        );
        window.three.camera.lookAt(new THREE.Vector3(0,0,0));

        var width = threeid.clientWidth;
        var height = threeid.clientHeight;
        window.three.camera.aspect = width / height;
        window.three.camera.updateProjectionMatrix();

        window.three.renderer.setSize(width, height);

        //window.three.renderer.setPixelRatio(window.devicePixelRatio);

        //window.three.renderer.antialias = true;
        window.three.renderer.render(window.three.scene, window.three.camera);
    }

    loop(){
        window.viewer.render();
        this.renderThreeAndObj();
    }
}