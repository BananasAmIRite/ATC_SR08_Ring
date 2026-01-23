import Chart from 'chart.js/auto';
import * as tf from '@tensorflow/tfjs';
import { connectToBLE, disconnectFromBLE, setNtfHandler } from './accelerometer/ble';
import { clearAccelPlot, initAccelChart, plotAccelData } from './plot';
import MLRecorder from './accelerometer/MLRecorder';

initAccelChart('accel-chart');

const recorder = new MLRecorder();
const handlers = recorder.getMLRecorderNtfHandler();

const connectBtn = document.getElementById('connect');
const disconnectBtn = document.getElementById('disconnect');
const plotBtn = document.getElementById('plot');
const stopPlotBtn = document.getElementById('stop-plot');
const stopClassifyBtn = document.getElementById('stop-plot-classify');
// const clearPlotBtn = document.getElementById('clear-plot');
const mlLabelInput = document.getElementById('ml-label') as HTMLInputElement;
const trainBtn = document.getElementById('train') as HTMLButtonElement;

connectBtn?.addEventListener('click', () => {
    connectToBLE();
});

disconnectBtn?.addEventListener('click', () => {
    disconnectFromBLE();
});

plotBtn?.addEventListener('click', () => {
    clearAccelPlot();
    handlers.start();
    setNtfHandler((a) => {
        plotAccelData(a);
        handlers.ntfHandler(a);
    });
    recorder.setCurrentLabel(mlLabelInput.value);
});

stopPlotBtn?.addEventListener('click', () => {
    handlers.stopAndTrain();
    setNtfHandler((a) => {});
    displayMLRecorderDataList(); // Auto-update data list on stop
});

stopClassifyBtn?.addEventListener('click', async () => {
    const val = await handlers.stopAndClassify();
    console.log(val);
});

// clearPlotBtn?.addEventListener('click', () => {});

trainBtn.addEventListener('click', () => {
    recorder.train();
});

// Utility to display all data points grouped by label
function displayMLRecorderDataList() {
    const grouped: Record<string, any[]> = {};
    recorder.getData().forEach((item: any) => {
        const label = item.label || 'unlabeled';
        if (!grouped[label]) grouped[label] = [];
        grouped[label].push(item.data);
    });
    // Create a simple string output
    let output = '';
    for (const label in grouped) {
        output += `Label: ${label} (${grouped[label].length} samples)\n`;
        grouped[label].forEach((data, idx) => {
            // Only show number of points and timestamp of first/last
            const nPoints = Array.isArray(data) ? data.length : 1;
            let firstTs = '',
                lastTs = '';
            if (Array.isArray(data) && data.length > 0) {
                firstTs = data[0].timestamp || '';
                lastTs = data[data.length - 1].timestamp || '';
            } else if (data && data.timestamp) {
                firstTs = lastTs = data.timestamp;
            }
            output += `  [${idx + 1}] Points: ${nPoints}, First: ${firstTs}, Last: ${lastTs}\n`;
        });
    }
    // Display in a <pre> element or console
    let pre = document.getElementById('ml-data-list') as HTMLPreElement;
    if (!pre) {
        pre = document.createElement('pre');
        pre.id = 'ml-data-list';
        document.body.appendChild(pre);
    }
    pre.textContent = output;
}

// Optionally, add a button to trigger this display
const showDataBtn = document.getElementById('show-ml-data');
showDataBtn?.addEventListener('click', displayMLRecorderDataList);
