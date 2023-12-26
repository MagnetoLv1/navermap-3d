import load from 'load-script';
import _ from 'lodash';
import device from '../utils/device';

const MAP_IMAGE_SIZE = 256;
class NaverMap {
    map: naver.maps.Map | null = null;
    imgCanvas: HTMLCanvasElement | null = null;
    constructor() {}
    async init(): Promise<void> {
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
                        zoom: 17
                    };

                    this.map = new naver.maps.Map('map', mapOptions);
                    this.map.addListener('init', async () => {
                        this.getMapTileInfo();
                        await this.drawImage();
                        resolve();
                    });
                    this.map.addListener('idle', async () => {
                        console.log('idle');
                        //this.getMapTileInfo();
                    });
                }
            );
        });
    }
    tileInfo: TileInfo[] = [];
    private async getMapTileInfo() {
        if (!this.map) return null;
        // console.log(
        //     this.map.getElement().children[0]?.children[0]?.children[0]
        // );
        const images = this.map.getElement().querySelectorAll('img');

        const mapImages = _.filter(images, (img: HTMLImageElement) => {
            return img.width == MAP_IMAGE_SIZE;
        });
        if (mapImages.length === 0) return null;

        this.tileInfo = _.map(mapImages, (img: HTMLImageElement) => {
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

        this.tileInfo.sort((a, b) => {
            return a.x - b.x || a.y - b.y;
        });
    }
    private async drawImage(): Promise<ResultInfo> {
        const mapInfo = this.calcImageInfo();
        if (!mapInfo) return Promise.reject();

        this.imgCanvas = document.createElement('canvas');
        const ctx = this.imgCanvas.getContext('2d')!;
        // pixel ratio
        const ratio = device.getPixelRatio(ctx);
        ctx.imageSmoothingEnabled = true;

        // TODO: 크기 정보는 이미지 크기로부터 구하는 걸로
        this.imgCanvas.width = MAP_IMAGE_SIZE * 3 * ratio;
        this.imgCanvas.height = MAP_IMAGE_SIZE * 3 * ratio;
        ctx.scale(ratio, ratio);
        await Promise.all(
            _.map(mapInfo?.imageInfos, async (info: ImageInfo) => {
                const image = await this.loadImage(info.img);
                ctx.drawImage(image, info.x, info.y, info.width, info.height);
            })
        );
        return {
            mapInfo,
            imgCanvas: this.imgCanvas
        };
    }

    private calcImageInfo(): MapInfo | null {
        if (!this.map) return null;
        const images = this.map.getElement().querySelectorAll('img');

        const mapImages = _.filter(images, (img: HTMLImageElement) => {
            return img.width == MAP_IMAGE_SIZE;
        });
        if (mapImages.length === 0) return null;

        const top =
            _.minBy(mapImages, (img: HTMLImageElement) => {
                return img.parentElement?.offsetTop;
            })?.parentElement?.offsetTop ?? 0;

        const left =
            _.minBy(mapImages, (img: HTMLImageElement) => {
                return img.parentElement?.offsetLeft;
            })?.parentElement?.offsetLeft ?? 0;

        const imageInfos = _.map(mapImages, (img: HTMLImageElement) => {
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
                img,
                x: offsetLeft - left,
                y: offsetTop - top,
                width: offsetWidth,
                height: offsetHeight
            };
        });
        return {
            left,
            top,
            imageInfos
        };
    }

    private loadImage(img: HTMLImageElement) {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'Anonymous';
            image.src = img.src;
            image.onload = () => {
                resolve(image);
            };
            image.onerror = (e) => {
                reject(e);
            };
        });
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

export interface TileInfo {
    src: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
