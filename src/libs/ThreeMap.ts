import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import NaverMap from './NaverMap';
import mathUtil from '../utils/mathUtil';
import * as dat from 'lil-gui';

const BACKGROUND_COLOR = '#e4e2de';
const CAMERA_Z_POS = 300;
const CONTROL_MIN_DISTANCE = 100;
const CONTROL_MAX_DISTANCE = 1700;
/**
 * 컨트롤 관련 상수
 */
const CONTROL_MIN_POLAR = 0; // 꼭대기
const CONTROL_MAX_POLAR = 60; // 지평선에서 30도 위 지점
class ThreeMap {
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    group: THREE.Group;
    pixelRatio = window.devicePixelRatio;
    canvasWidth: number;
    canvasHeight: number;
    controls: OrbitControls;
    targetDiv: HTMLDivElement;
    gui: dat.GUI;
    naverMap: NaverMap;

    tileInfo: MapTileInfo = new Map();

    constructor(targetDiv: HTMLDivElement) {
        this.gui = new dat.GUI();
        this.gui.close();

        this.naverMap = new NaverMap();
        this.naverMap.onInit(this.naverMapInitHandler.bind(this));
        this.naverMap.onTilesChange(this.tilesChangeHandler.bind(this));
        this.naverMap.load();

        this.targetDiv = targetDiv;
        this.canvasWidth = this.targetDiv.offsetWidth;
        this.canvasHeight = this.targetDiv.offsetHeight;

        this.scene = new THREE.Scene();

        this.group = new THREE.Group();
        this.group.rotation.x = mathUtil.toRadian(-90);
        this.scene.add(this.group);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setClearColor(BACKGROUND_COLOR);

        this.targetDiv.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(
            50,
            this.canvasWidth / this.canvasHeight,
            0.1,
            10000
        );
        this.camera.position.z = CAMERA_Z_POS;
        this.camera.position.y = CAMERA_Z_POS;

        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.init();
    }

    private init() {
        this.resize();
        this.initControls();
        this.initHelper();
        this.animate();
    }
    private initHelper() {
        // 격자를 표시하는 헬퍼
        const gridHelper = new THREE.GridHelper(256 * 6, 6, 0x0000ff, 0x808080);
        this.scene.add(gridHelper);

        //x, y, z 축을 표시하는 축 헬퍼
        const axesHelper = new THREE.AxesHelper(256 * 6);
        this.scene.add(axesHelper);

        const cameraHelper = new THREE.CameraHelper(this.camera);
        this.scene.add(cameraHelper);
        // add gui
        this.gui.add(gridHelper, 'visible').name('Grid');
        this.gui.add(axesHelper, 'visible').name('Axes');
        this.gui.add(cameraHelper, 'visible').name('camera');
    }

    naverMapInitHandler() {
        // 카메라는 센데 위치로 변경
        const { x, y } = this.naverMap.getCenter();
        this.controls.target.set(x, 0, y);
        this.camera.position.x = x;
        this.camera.position.z = CAMERA_Z_POS + y;
        this.camera.position.y = CAMERA_Z_POS;
    }
    tilesChangeHandler(tileInfo: Array<TileInfo>) {
        this.setMapPlane(tileInfo);
    }

    private animate = () => {
        if (!this.renderer) {
            return;
        }

        window.requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };
    /**
     * 캔버스의 크기를 Wrapper 의 크기에 맞춘다.
     */
    private resize() {
        const targetDiv = this.targetDiv;

        this.canvasWidth = targetDiv.offsetWidth;
        this.canvasHeight = targetDiv.offsetHeight;

        if (this.renderer) {
            this.renderer.setSize(this.canvasWidth, this.canvasHeight);
        }
    }

    private setMapPlane(titleInfos: Array<TileInfo>) {
        // Compare keys in the first map

        const newTileInfo: Array<TileInfo> = [];
        titleInfos.forEach((tileInfo) => {
            if (!this.tileInfo.has(tileInfo.src)) {
                newTileInfo.push(tileInfo);
            }
            this.tileInfo.set(tileInfo.src, tileInfo);
        });

        const textureLoader = new THREE.TextureLoader();

        // 기존에 생성한 메시와 재질
        let mesh: THREE.Mesh;
        // 평면 메시 생성

        newTileInfo.forEach((tileInfo) => {
            const texture = textureLoader.load(tileInfo.src);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                wireframe: false
            });

            // 메시가 없는 경우에는 새로 생성합니다.
            // 평면 지오메트리를 생성합니다.
            const geometry = new THREE.PlaneGeometry(
                tileInfo.width,
                tileInfo.height
            );

            // 메시를 생성하여 재질을 적용합니다.
            mesh = new THREE.Mesh(geometry, material);

            // 씬에 메시를 추가합니다.
            this.group.add(mesh);

            // 타일의 좌표에 메시를 배치합니다.
            mesh.position.set(
                tileInfo.x + tileInfo.width / 2,
                -tileInfo.y - tileInfo.height / 2,
                0
            );
        });
    }

    private initControls() {
        this.controls.minPolarAngle = mathUtil.toRadian(CONTROL_MIN_POLAR);
        this.controls.maxPolarAngle = mathUtil.toRadian(CONTROL_MAX_POLAR);
        this.controls.minDistance = CONTROL_MIN_DISTANCE;
        this.controls.maxDistance = CONTROL_MAX_DISTANCE;
        this.controls.addEventListener('end', () => {
            // 현재 카메라의 위치
            const cameraPosition = new THREE.Vector3();
            this.camera.getWorldPosition(cameraPosition);

            // 현재 target의 위치
            const targetPosition = this.controls.target.clone();

            // 카메라와 target 사이의 벡터
            const vectorBetweenCameraAndTarget =
                targetPosition.sub(cameraPosition);

            // y 값이 0이 되는 지점의 좌표
            const t = -cameraPosition.y / vectorBetweenCameraAndTarget.y;
            const intersectionPoint = new THREE.Vector3()
                .copy(cameraPosition)
                .add(vectorBetweenCameraAndTarget.multiplyScalar(t));

            // NaverMap 좌표로 변환
            this.naverMap.setCenter(intersectionPoint.x, intersectionPoint.z);
        });
    }

    public destroy() {
        this.targetDiv.removeChild(this.renderer.domElement);
    }
}
export default ThreeMap;
