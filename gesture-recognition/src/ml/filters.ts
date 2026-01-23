import { AccelDataPoint } from '../plot';

export type GravitySeparationResult = {
    gravity: AccelDataPoint[];
    linear: AccelDataPoint[];
};

/**
 * Separates gravity and linear acceleration using a low-pass filter.
 * alpha: smoothing factor (0 < alpha < 1), e.g. 0.8 for strong gravity separation
 */
export function separateGravityAndLinearAccel(data: AccelDataPoint[], alpha: number = 0.8): GravitySeparationResult {
    let gravityX = data[0].x,
        gravityY = data[0].y,
        gravityZ = data[0].z;
    const gravity: AccelDataPoint[] = [];
    const linear: AccelDataPoint[] = [];

    for (const point of data) {
        gravityX = alpha * gravityX + (1 - alpha) * point.x;
        gravityY = alpha * gravityY + (1 - alpha) * point.y;
        gravityZ = alpha * gravityZ + (1 - alpha) * point.z;

        gravity.push({
            x: gravityX,
            y: gravityY,
            z: gravityZ,
            timestamp: point.timestamp,
        });
        linear.push({
            x: point.x - gravityX,
            y: point.y - gravityY,
            z: point.z - gravityZ,
            timestamp: point.timestamp,
        });
    }

    return { gravity, linear };
}
