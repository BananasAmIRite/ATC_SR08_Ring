import { separateGravityAndLinearAccel } from '../shared/ml/filters';
import { prepareClassificationData } from '../shared/ml/preprocessing';
import { AccelDataPoint } from '../shared/plot';
import { AccelNtfHandler } from '../shared/accelerometer/ble';

export type ClassifyHandlerData = {
    results: any[];
    segment: AccelDataPoint[];
};

export default class ClassificationMLRecorder {
    // RAW accel data (needs to be processed)
    private datapoints: AccelDataPoint[] = [];
    private neuralNet!: ml5.NeuralNetwork;
    private classifyHandler: (data: ClassifyHandlerData) => void = () => {};

    public constructor(
        private resampleSize: number = 50,
        private sampleSize: number = 15, // number of actual samples to record over a sliding window on which to classify from,
        private ignoredAccelMagnitude: number = 0.1, // average accel magnitude for which we ignore the classification
    ) {
        ml5.setBackend('webgpu');

        this.resetNetwork();
    }

    private resetNetwork() {
        this.neuralNet = ml5.neuralNetwork({
            task: 'classification',
            debug: true,
        });
    }

    public getMLRecorderNtfHandler() {
        // Majority vote buffer
        const labelBuffer: string[] = [];
        const bufferSize = 4; // window size for majority vote
        const handler: AccelNtfHandler = (d) => {
            // Always keep only the last sampleSize points
            this.datapoints.push(d);
            if (this.datapoints.length > this.sampleSize) {
                this.datapoints = this.datapoints.slice(-this.sampleSize);
            }

            // Remove gravity and compute magnitude for each point
            const linear = separateGravityAndLinearAccel(this.datapoints, 0.8).linear;
            // Find the contiguous segment at the end above the threshold
            let startIdx = linear.length;
            for (let i = linear.length - 1; i >= 0; i--) {
                const magn = Math.hypot(linear[i].x, linear[i].y, linear[i].z);
                if (magn >= this.ignoredAccelMagnitude) {
                    startIdx = i;
                } else {
                    break;
                }
            }
            const activeSegment = linear.slice(startIdx);
            if (activeSegment.length <= 10) return; // Too little active segment above threshold

            // Resample only the active segment
            const prepped = prepareClassificationData(activeSegment, this.resampleSize);
            this.neuralNet.classify(prepped, (d) => {
                // d is an array of {label, confidence}
                if (Array.isArray(d) && d.length && d[0].label) {
                    labelBuffer.push(d[0].label);
                    if (labelBuffer.length > bufferSize) labelBuffer.shift();
                    // Majority vote
                    const counts: Record<string, number> = {};
                    for (const label of labelBuffer) counts[label] = (counts[label] || 0) + 1;
                    let majorityLabel = d[0].label;
                    let maxCount = 0;
                    for (const label in counts) {
                        if (counts[label] > maxCount) {
                            maxCount = counts[label];
                            majorityLabel = label;
                        }
                    }
                    // Replace top label with majority label, keep confidences as-is
                    const newResult = d.map((item, idx) => (idx === 0 ? { ...item, label: majorityLabel } : item));
                    this.classifyHandler({ results: newResult, segment: activeSegment });
                } else {
                    this.classifyHandler({ results: d, segment: activeSegment });
                }
            });
        };

        return {
            ntfHandler: handler,
        };
    }

    public setClassifyHandler(handler: (data: ClassifyHandlerData) => void) {
        this.classifyHandler = handler;
    }

    public getData() {
        return this.datapoints;
    }

    public async loadModel(files: FileList | string) {
        if (!this.neuralNet) this.resetNetwork();
        // If files are provided (from file input), use them, else prompt user
        if (files) {
            await this.neuralNet.load(files);
        }
    }
}
