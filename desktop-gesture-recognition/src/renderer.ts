// /**
//  * This file will automatically be loaded by vite and run in the "renderer" context.
//  * To learn more about the differences between the "main" and the "renderer" context in
//  * Electron, visit:
//  *
//  * https://electronjs.org/docs/tutorial/process-model
//  *
//  * By default, Node.js integration in this file is disabled. When enabling Node.js integration
//  * in a renderer process, please be aware of potential security implications. You can read
//  * more about security risks here:
//  *
//  * https://electronjs.org/docs/tutorial/security
//  *
//  * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
//  * flag:
//  *
//  * ```
//  *  // Create the browser window.
//  *  mainWindow = new BrowserWindow({
//  *    width: 800,
//  *    height: 600,
//  *    webPreferences: {
//  *      nodeIntegration: true
//  *    }
//  *  });
//  * ```
//  */

// import './index.css';

// console.log(
//   '👋 This message is being logged by "renderer.ts", included via Vite',
// );
import { connectToBLE, disconnectFromBLE, setNtfHandler } from './lib/shared/accelerometer/ble';
import { clearAccelPlot, initAccelChart, plotAccelData } from './lib/shared/plot';
import ClassificationMLRecorder from './lib/classify/ClassificationMLRecorder';
import { debounce } from './lib/utils';

initAccelChart('accel-chart');

const recorder = new ClassificationMLRecorder();
const handlers = recorder.getMLRecorderNtfHandler();

const connectBtn = document.getElementById('connect') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnect') as HTMLButtonElement;
const plotBtn = document.getElementById('plot') as HTMLButtonElement;
const stopPlotBtn = document.getElementById('stop-plot') as HTMLButtonElement;
const loadModelBtn = document.getElementById('load-model') as HTMLButtonElement;

let isConnected = false;
let isModelLoaded = false;

function updateButtonStates() {
    connectBtn.disabled = isConnected;
    disconnectBtn.disabled = !isConnected;
    plotBtn.disabled = !(isConnected && isModelLoaded);
    stopPlotBtn.disabled = !(isConnected && isModelLoaded);
}

updateButtonStates();

connectBtn?.addEventListener('click', () => {
    connectToBLE();
    isConnected = true;
    updateButtonStates();
});

disconnectBtn?.addEventListener('click', () => {
    disconnectFromBLE();
    isConnected = false;
    updateButtonStates();
});

plotBtn?.addEventListener('click', () => {
    clearAccelPlot();
    setNtfHandler((a) => {
        plotAccelData(a);
        handlers.ntfHandler(a);
    });
    plotBtn.disabled = true;
    stopPlotBtn.disabled = false;
});

stopPlotBtn?.addEventListener('click', () => {
    setNtfHandler((a) => {});
    plotBtn.disabled = false;
    stopPlotBtn.disabled = true;
});

loadModelBtn?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e: any) => {
        var files = e.target.files;
        recorder.loadModel(files).then(() => {
            isModelLoaded = true;
            updateButtonStates();
        });
    };
    input.click();
});

const CLASSIFICATION_CONFIDENCE_THRES = 0.8;

function handleClassificationResult(result: any) {
    if (result.length == 0) throw new Error('No classification results');

    const sorted = [...result].sort((a, b) => b.confidence - a.confidence);

    const firstLabel = sorted[0].label;
    const firstConf = sorted[0].confidence;

    if (firstConf >= CLASSIFICATION_CONFIDENCE_THRES) {
        switch (firstLabel) {
            case 'circle-cw':
                window.electronAPI.incrementSystemVolume(3);
                break;
            case 'circle-ccw':
                window.electronAPI.incrementSystemVolume(-3);
                break;
            case 'horiz-tap':
                debounce(1)(() => window.electronAPI.minimizeForegroundWindow());
                break;
            case 'vert-tap':
                debounce(1)(() => window.electronAPI.maximizeForegroundWindow());
                break;
            default:
                break;
        }
    }

    displayClassificationResult(result);
}

// Utility to display classification result
function displayClassificationResult(result: any) {
    let pre = document.getElementById('ml-classify-result') as HTMLPreElement;
    if (!pre) {
        pre = document.createElement('pre');
        pre.id = 'ml-classify-result';
        document.body.appendChild(pre);
    }
    // Modern Bootstrap progress bar display for results (no sorting)
    if (Array.isArray(result) && result.length && result[0].label && result[0].confidence !== undefined) {
        let html = '';
        result.forEach((item, idx) => {
            const percent = (item.confidence * 100).toFixed(1);
            html += `
                    <div class="d-flex align-items-center ">
                        <span class="fw-semibold">${item.label}</span>
                        <div class="progress flex-grow-1 bg-dark mx-2" style="height: 1.1em; min-width: 80px;">
                            <div class="progress-bar ${idx === 0 ? 'bg-primary' : 'bg-secondary'}" role="progressbar" style="width: ${percent}%" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <span class="small" style="min-width: 48px; text-align: right;">${percent}%</span>
                    </div>
            `;
        });
        // html += '</div>';
        pre.innerHTML = html;
    } else {
        pre.textContent =
            typeof result === 'string' ? result : `Classification Result:\n${JSON.stringify(result, null, 2)}`;
    }
}

recorder.setClassifyHandler((d) => handleClassificationResult(d));
// (renderer.ts is now split; see classify-renderer.ts and trainer-renderer.ts)
