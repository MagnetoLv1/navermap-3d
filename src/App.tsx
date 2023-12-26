import { useEffect, useRef } from 'react';
import './App.css';
import NaverMap from './libs/NaverMap';
import ThreeMap from './libs/ThreeMap';

function App() {
    const viewRef = useRef<HTMLDivElement>(null);
    const threeMapRef = useRef<ThreeMap | null>(null);
    useEffect(() => {
        if (viewRef.current && !threeMapRef.current) {
            threeMapRef.current = new ThreeMap(viewRef.current);
            const naverMap = new NaverMap();
            naverMap.init().then(async () => {
                threeMapRef.current?.setMap(naverMap?.map);
                threeMapRef.current?.setMapPlane(naverMap.tileInfo);
            });
        }

        return () => {
            if (threeMapRef.current) {
                threeMapRef.current.destroy();
                threeMapRef.current = null;
            }
        };
    }, []);

    return (
        <>
            <div
                id="map"
                style={{
                    width: 355,
                    height: 355
                }}
            ></div>
            <div
                ref={viewRef}
                className="canvasview"
                style={{
                    width: 710,
                    height: 710
                }}
            ></div>
        </>
    );
}

export default App;
