export {};

declare global {
    interface Window {
        electronAPI: {
            setSystemVolume: (volume: number) => void;
        };
    }
}
