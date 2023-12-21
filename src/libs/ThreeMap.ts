import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MapInfo } from './NaverMap';
import mathUtil from '../utils/mathUtil';

const BACKGROUND_COLOR = '#e4e2de';
const CAMERA_Z_POS = 300;
const CONTROL_MIN_DISTANCE = 100;
const CONTROL_MAX_DISTANCE = 700;
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
    orbitControls: OrbitControls;
    targetDiv: HTMLDivElement;
    plane: THREE.Mesh | null = null;
    map: naver.maps.Map | null = null;

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

        this.orbitControls = new OrbitControls(
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
        this._initOrbitControls();
        this._animate();
        this.setAngle(90);
    }

    _animate = () => {
        if (!this.renderer) {
            // Renderer 가 해제된 상태이므로 loop 를 지속하지 않는다.
            return;
        }

        window.requestAnimationFrame(this._animate);
        this.orbitControls.update();
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

    setMapPlane(imgCanvas: HTMLCanvasElement, mapInfo: MapInfo) {
        if (this.plane) {
            this._objectGroup.remove(this.plane);
            this.plane.geometry.dispose();
            this.plane = null;
        }
        // 이미지 너비가 그려질 영역의 너비보다 어느 정도 큰지의 비율
        const imgWidth = imgCanvas.width / this.pixelRatio;
        const imgHeight = imgCanvas.height / this.pixelRatio;

        const texture = new THREE.CanvasTexture(imgCanvas);
        texture.minFilter = THREE.NearestFilter; // mip 을 생성하지 않도록 함 (mipmap 생성 시 resize 및 불필요한 메모리 사용 이슈 제거를 위함)
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            color: 0xffffff
        });

        const geometry = new THREE.PlaneGeometry(imgWidth, imgHeight);
        texture.dispose(); // Material 사용 후 바로 필요 없어짐

        this.plane = new THREE.Mesh(geometry, material);
        this.plane.castShadow = false;
        this.plane.receiveShadow = true;
        this._objectGroup.add(this.plane);

        const leftCorrection =
            Math.abs(mapInfo.left) - (imgWidth - this.canvasWidth) / 2;
        const topCorrection =
            Math.abs(mapInfo.top) - (imgHeight - this.canvasHeight) / 2;

        this.plane.position.x = -leftCorrection;
        this.plane.position.y = +topCorrection;
    }

    _initOrbitControls() {
        this.orbitControls.minPolarAngle = mathUtil.toRadian(CONTROL_MIN_POLAR);
        this.orbitControls.maxPolarAngle = mathUtil.toRadian(CONTROL_MAX_POLAR);
        this.orbitControls.minDistance = CONTROL_MIN_DISTANCE;
        this.orbitControls.maxDistance = CONTROL_MAX_DISTANCE;
        this.orbitControls.addEventListener('change', () => {
            const vector3 = new THREE.Vector3();
            // 카메라의 3D 좌표를 2D 좌표로 변환
            const vector = vector3.project(this.camera);

            // 변환된 2D 좌표 출력 ( -1에서 1이라면, 0.5를 곱하고 0.5를 더해 0에서 1로 변환)
            const x = (vector.x * 0.5 + 0.5) * this.canvasWidth;
            const y = (vector.y * -0.5 + 0.5) * this.canvasHeight;

            // NaverMap 좌표로 변환
            const projection = this.map?.getProjection();
            if (projection) {
                const mapPoint = new naver.maps.Point(x, y);
                const mapCoord = projection.fromOffsetToCoord(mapPoint);
                console.log(
                    'NaverMap Coordinates:',
                    mapCoord,
                    this.map?.getCenter()
                );
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
