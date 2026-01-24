import { data } from '@tensorflow/tfjs';
import { prepareData } from '../ml/preprocessing';
import { AccelDataPoint } from '../plot';
import { AccelNtfHandler } from './ble';
import { separateGravityAndLinearAccel } from '../ml/filters';
import { augmentByZRotation } from '../ml/datagen';

export default class DataRecorder {
    private datapoints: { data: AccelDataPoint[]; label: string }[] = [];
    private currentLabel: string = '';
    private neuralNet!: ml5.NeuralNetwork;

    public constructor(private resampleSize: number = 50) {
        ml5.setBackend('webgpu');

        this.resetNetwork();
    }

    private resetNetwork() {
        this.neuralNet = ml5.neuralNetwork({
            task: 'classification',
            debug: true,
        });
    }

    public train() {
        this.resetNetwork();

        // train stuff

        const augmented = this.datapoints.flatMap((e) =>
            augmentByZRotation(e.data, 8).map((a) => ({ label: e.label, data: a })),
        );

        console.log('augmented', augmented);

        const preppedData = augmented.map((e) => ({
            data: prepareData(e.data, this.resampleSize),
            label: e.label,
        }));

        for (const d of preppedData) {
            console.log('added data: ', d.label, d.data);
            this.neuralNet.addData(d.data, [d.label]);
        }

        // this.neuralNet.normalizeData();

        this.neuralNet.train(() => {
            console.log('Training finished');
        });
    }

    public addPoint(data: AccelDataPoint[]) {
        this.datapoints.push({ data, label: this.currentLabel });
    }

    public setCurrentLabel(label: string) {
        this.currentLabel = label;
    }

    public getMLRecorderNtfHandler() {
        let recording = false;
        const accumData: AccelDataPoint[] = [];

        const startRecording = () => {
            recording = true;
        };

        const stopRecordingAndTrain = () => {
            recording = false;
            if (accumData.length == 0) return;
            console.log(`data: `, accumData);
            // separate gravity and accel for this series of data
            const separated = separateGravityAndLinearAccel(accumData, 0.8).world;
            console.log(`Separated: `, separated);

            this.addPoint(separated);

            console.log(`Total Array: `, this.datapoints);

            // clear accumData
            accumData.splice(0, accumData.length);
        };

        const stopRecordingAndClassify = () =>
            new Promise((res, rej) => {
                recording = false;
                if (accumData.length == 0) return;
                console.log(`data: `, accumData);
                // separate gravity and accel for this series of data
                const separated = separateGravityAndLinearAccel(accumData, 0.8).world;
                console.log(`Separated: `, separated);

                const prepped = prepareData(separated, this.resampleSize);

                // clear accumData
                accumData.splice(0, accumData.length);

                this.neuralNet.classify(prepped, (d) => {
                    res(d);
                });
            });

        const handler: AccelNtfHandler = (d) => {
            if (!recording) return;
            accumData.push(d);
        };

        return {
            start: startRecording,
            stopAndTrain: stopRecordingAndTrain,
            stopAndClassify: stopRecordingAndClassify,
            ntfHandler: handler,
        };
    }

    public getData() {
        return this.datapoints;
    }
}
