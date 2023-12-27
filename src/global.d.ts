export {};

declare global {
    interface TileInfo {
        src: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }

    type MapTileInfo = Map<string, TileInfo>;
}
