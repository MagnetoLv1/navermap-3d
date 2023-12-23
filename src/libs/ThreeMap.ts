import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MapInfo, TileInfo } from './NaverMap';
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

    setMapPlane(
        imgCanvas: HTMLCanvasElement,
        mapInfo: MapInfo,
        titleInfos: Array<TileInfo>
    ) {
        if (this.plane) {
            this._objectGroup.remove(this.plane);
            this.plane.geometry.dispose();
            this.plane = null;
        }

        const textureLoader = new THREE.TextureLoader();

        const baseMaterial = new THREE.MeshBasicMaterial();
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
            mesh.position.set(tileInfo.x, -tileInfo.y, 0);
        });

        // 이미지 너비가 그려질 영역의 너비보다 어느 정도 큰지의 비율t
        // const imgWidth = imgCanvas.width / this.pixelRatio;
        // const imgHeight = imgCanvas.height / this.pixelRatio;

        // THREE.BufferGeometry;

        // const texture = new THREE.CanvasTexture(imgCanvas);
        // texture.minFilter = THREE.NearestFilter; // mip 을 생성하지 않도록 함 (mipmap 생성 시 resize 및 불필요한 메모리 사용 이슈 제거를 위함)
        // const material = new THREE.MeshBasicMaterial({
        //     map: texture,
        //     color: 0xffffff
        // });

        // const geometry = new THREE.PlaneGeometry(imgWidth, imgHeight);
        // texture.dispose(); // Material 사용 후 바로 필요 없어짐

        // this.plane = new THREE.Mesh(geometry, material);
        // this.plane.castShadow = false;
        // this.plane.receiveShadow = true;
        // this._objectGroup.add(this.plane);

        // const leftCorrection =
        //     Math.abs(mapInfo.left) - (imgWidth - this.canvasWidth) / 2;
        // const topCorrection =
        //     Math.abs(mapInfo.top) - (imgHeight - this.canvasHeight) / 2;

        // this.plane.position.x = -leftCorrection;
        // this.plane.position.y = +topCorrection;
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
