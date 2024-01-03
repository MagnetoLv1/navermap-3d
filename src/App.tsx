import { useEffect, useRef } from 'react';
import './App.css';
import ThreeMap from './libs/ThreeMap';

function App() {
    const viewRef = useRef<HTMLDivElement>(null);
    const threeMapRef = useRef<ThreeMap | null>(null);
    useEffect(() => {
        if (viewRef.current && !threeMapRef.current) {
            threeMapRef.current = new ThreeMap(viewRef.current);
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
            <div id="map"></div>
            <div ref={viewRef} className="canvasview"></div>
            <div className="arrow">
                ⬆️
                <br />
                ⬅️⬇️➡️
            </div>
        </>
    );
}

export default App;
