export {};

declare global {
    interface Window {
        electronAPI: {
            setSystemVolume: (volume: number) => void;
            incrementSystemVolume: (amount: number) => void;
            minimizeForegroundWindow: () => void;
            maxmimizeForegroundWindow: () => void;
        };
    }
}
