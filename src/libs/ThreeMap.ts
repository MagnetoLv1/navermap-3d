import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TileInfo } from './NaverMap';
import mathUtil from '../utils/mathUtil';

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
    scene: THREE.Scene;
    _objectGroup: THREE.Group;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    pixelRatio = window.devicePixelRatio;
    canvasWidth: number;
    canvasHeight: number;
    controls: OrbitControls;
    targetDiv: HTMLDivElement;
    plane: THREE.Mesh | null = null;
    map: naver.maps.Map | null = null;
    bufferGeometry: THREE.BufferGeometry;

    constructor(targetDiv: HTMLDivElement) {
        this.targetDiv = targetDiv;
        this.canvasWidth = this.targetDiv.offsetWidth;
        this.canvasHeight = this.targetDiv.offsetHeight;

        this.scene = new THREE.Scene();

        this._objectGroup = new THREE.Group();
        this.scene.add(this._objectGroup);

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
        // 초기 BufferGeometry를 생성합니다.
        this.bufferGeometry = new THREE.BufferGeometry();
        const material = new THREE.MeshBasicMaterial();
        const mesh = new THREE.Mesh(this.bufferGeometry, material);
        this._objectGroup.add(mesh);

        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this._init();
    }
    setMap(map: naver.maps.Map | null) {
        this.map = map;
    }

    _init() {
        this.resize();
        this._initControls();
        this._animate();
        this.setAngle(90);
    }

    _animate = () => {
        if (!this.renderer) {
            // Renderer 가 해제된 상태이므로 loop 를 지속하지 않는다.
            return;
        }

        window.requestAnimationFrame(this._animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };
    /**
     * 캔버스의 크기를 Wrapper 의 크기에 맞춘다.
     */
    resize() {
        const targetDiv = this.targetDiv;

        this.canvasWidth = targetDiv.offsetWidth;
        this.canvasHeight = targetDiv.offsetHeight;

        if (this.renderer) {
            this.renderer.setSize(this.canvasWidth, this.canvasHeight);
        }
    }

    setMapPlane(titleInfos: Array<TileInfo>) {
        if (this.plane) {
            this._objectGroup.remove(this.plane);
            this.plane.geometry.dispose();
            this.plane = null;
        }

        const textureLoader = new THREE.TextureLoader();

        // 기존에 생성한 메시와 재질
        let mesh: THREE.Mesh;
        console.log('titleInfo', titleInfos);
        // 평면 메시 생성

        titleInfos.forEach((tileInfo) => {
            const texture = textureLoader.load(tileInfo.src);
            const material = new THREE.MeshBasicMaterial({
                map: texture
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
            this._objectGroup.add(mesh);

            // 타일의 좌표에 메시를 배치합니다.
            mesh.position.set(
                tileInfo.x + tileInfo.width / 2,
                -tileInfo.y - tileInfo.height / 2,
                0
            );
        });

        // 카메라는 센데 위치로 변경
        const { offsetWidth, offsetHeight } = this.map?.getElement() ?? {
            offsetWidth: 0,
            offsetHeight: 0
        };
        this.controls.target.set(offsetWidth / 2, 0, offsetHeight / 2);
        this.camera.position.x = offsetWidth / 2;
        this.camera.position.z = CAMERA_Z_POS + offsetHeight / 2;
        this.camera.position.y = CAMERA_Z_POS;
    }

    _initControls() {
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
            const projection = this.map?.getProjection();
            if (projection) {
                const mapPoint = new naver.maps.Point(
                    intersectionPoint.x,
                    intersectionPoint.z
                );

                const mapCoord = projection.fromOffsetToCoord(mapPoint);
                this.map?.setCenter(mapCoord);
            }
        });
    }

    destroy() {
        this.targetDiv.removeChild(this.renderer.domElement);
    }

    setAngle(angle: number) {
        this._objectGroup.rotation.x = mathUtil.toRadian(-angle);
    }
}
export default ThreeMap;
