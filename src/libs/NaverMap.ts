import load from 'load-script';
import _ from 'lodash';

type onTilesChangeType = (tiles: Array<TileInfo>) => void;
type onInitType = () => void;
const MAP_IMAGE_SIZE = 256;
class NaverMap {
    map: naver.maps.Map | null = null;
    imgCanvas: HTMLCanvasElement | null = null;
    _handleInit: onInitType | null = null;
    _handleTilesChage: onTilesChangeType | null = null;
    tileInfo: MapTileInfo = new Map();

    public async load(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.map) {
                reject();
                return;
            }
            load(
                `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${
                    import.meta.env.VITE_NAVER_MAP_CLIENT_ID
                }&submodules=panorama`,
                () => {
                    const mapOptions = {
                        center: new naver.maps.LatLng(37.345546, 127.0904539),
                        zoom: 17,
                        draggable: false,
                        pinchZoom: false,
                        scrollWheel: false,
                        keyboardShortcuts: false,
                        disableDoubleTapZoom: true,
                        disableDoubleClickZoom: true,
                        disableTwoFingerTapZoom: true
                    };

                    this.map = new naver.maps.Map('map', mapOptions);
                    this.map.addListener('init', this.initHandler.bind(this));
                    this.map.addListener(
                        'tilesloaded',
                        this.tilesChangeHandler.bind(this)
                    );
                    resolve();
                }
            );
        });
    }

    private initHandler() {
        this._handleInit?.();
    }
    private async tilesChangeHandler() {
        const tileInfo = await this.getMapTileInfo();
        this._handleTilesChage?.(tileInfo);
    }
    private async getMapTileInfo() {
        if (!this.map) return [];
        const images = this.map.getElement().querySelectorAll('img');

        const mapImages = _.filter(images, (img: HTMLImageElement) => {
            return img.width == MAP_IMAGE_SIZE;
        });
        if (mapImages.length === 0) return [];

        return _.map(mapImages, (img: HTMLImageElement) => {
            const {
                offsetTop,
                offsetLeft,
                offsetWidth = 0,
                offsetHeight = 0
            } = img.parentElement ?? {
                offsetTop: 0,
                offsetLeft: 0,
                width: MAP_IMAGE_SIZE,
                height: MAP_IMAGE_SIZE
            };

            return {
                src: img.src,
                x: offsetLeft,
                y: offsetTop,
                width: offsetWidth,
                height: offsetHeight
            };
        });
    }

    public onInit(handle: onInitType) {
        this._handleInit = handle;
    }
    public onTilesChange(handle: onTilesChangeType) {
        this._handleTilesChage = handle;
    }
    public getCenter() {
        const { offsetWidth, offsetHeight } = this.map?.getElement() ?? {
            offsetWidth: 0,
            offsetHeight: 0
        };
        return new naver.maps.Point(offsetWidth / 2, offsetHeight / 2);
    }
    public setCenter(x: number, y: number) {
        // NaverMap 좌표로 변환
        const projection = this.map?.getProjection();
        if (projection) {
            const mapPoint = new naver.maps.Point(x, y);

            const mapCoord = projection.fromOffsetToCoord(mapPoint);
            this.map?.setCenter(mapCoord);
        }
    }

    set visible(value: boolean) {
        const elm = this.map?.getElement();
        if (elm) {
            if (value) {
                elm.classList.remove('hide');
            } else {
                elm.classList.add('hide');
            }
        }
    }

    get visible() {
        const elm = this.map?.getElement();
        if (elm) {
            return elm.classList.contains('hide') === false;
        } else {
            return true;
        }
    }
}

export default NaverMap;

export interface ImageInfo {
    img: HTMLImageElement;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MapInfo {
    left: number;
    top: number;
    imageInfos: Array<ImageInfo>;
}

export interface ResultInfo {
    mapInfo: MapInfo;
    imgCanvas: HTMLCanvasElement;
}
