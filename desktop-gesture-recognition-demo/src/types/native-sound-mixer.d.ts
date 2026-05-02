// native-sound-mixer.d.ts
declare module 'native-sound-mixer' {
    export class Device {
        volume: number;
        mute: boolean;
        balance: { left: number; right: number; stereo?: boolean };
        readonly name: string;
        readonly type: number;
        readonly sessions: any[];
        on(ev: string, callback: (payload: any) => void): number;
        removeListener(ev: string, handler: number): boolean;
    }

    export interface VolumeBalance {
        right: number;
        left: number;
        stereo?: boolean;
    }

    export interface AudioSession {}

    export interface SoundMixerStatic {
        getDefaultDevice(type: number): Device;
        getDevices(type: number): Device[];
        devices: Device[];
        // Add other static methods/properties as needed
    }

    const SoundMixer: {
        default: SoundMixerStatic;
        AudioSessionState: Record<string, number | string>;
        DeviceType: Record<string, number | string>;
    };

    export default SoundMixer;
}
