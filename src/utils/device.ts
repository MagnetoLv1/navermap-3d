interface ExtendedCanvasRenderingContext2D extends CanvasRenderingContext2D {
    webkitBackingStorePixelRatio?: number;
    mozBackingStorePixelRatio?: number;
    msBackingStorePixelRatio?: number;
    oBackingStorePixelRatio?: number;
    backingStorePixelRatio?: number;
}

export const getPixelRatio = (
    context: ExtendedCanvasRenderingContext2D | null
) => {
    if (context) {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const backingStoreRatio =
            context.webkitBackingStorePixelRatio ||
            context.mozBackingStorePixelRatio ||
            context.msBackingStorePixelRatio ||
            context.oBackingStorePixelRatio ||
            context.backingStorePixelRatio ||
            1;
        return devicePixelRatio / backingStoreRatio;
    }
    return 1;
};

export default {
    getPixelRatio
};
