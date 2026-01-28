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
import { connectToBLE, disconnectFromBLE, setNtfHandler } from './lib/accelerometer/ble';
import { clearAccelPlot, initAccelChart, plotAccelData } from './lib/plot';
import MLRecorder from './lib/accelerometer/MLRecorder';

initAccelChart('accel-chart');

const recorder = new MLRecorder();
const handlers = recorder.getMLRecorderNtfHandler();

const connectBtn = document.getElementById('connect');
const disconnectBtn = document.getElementById('disconnect');
const plotBtn = document.getElementById('plot');
const stopPlotBtn = document.getElementById('stop-plot');
// const clearPlotBtn = document.getElementById('clear-plot');
const loadModelBtn = document.getElementById('load-model') as HTMLButtonElement;

connectBtn?.addEventListener('click', () => {
    connectToBLE();
});

disconnectBtn?.addEventListener('click', () => {
    disconnectFromBLE();
});

plotBtn?.addEventListener('click', () => {
    clearAccelPlot();
    setNtfHandler((a) => {
        plotAccelData(a);
        handlers.ntfHandler(a);
    });
});

stopPlotBtn?.addEventListener('click', () => {
    setNtfHandler((a) => {});
});

loadModelBtn?.addEventListener('click', () => {
    console.log('inputting?');
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    input.onchange = (e: any) => {
        var files = e.target.files;

        recorder.loadModel(files);
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
                window.electronAPI.minimizeForegroundWindow();
                break;
            case 'vert-tap':
                window.electronAPI.maxmimizeForegroundWindow();
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
    // If result is an array of objects with label/confidence, display sorted and bold top
    if (Array.isArray(result) && result.length && result[0].label && result[0].confidence !== undefined) {
        const sorted = [...result].sort((a, b) => b.confidence - a.confidence);
        let html = 'Classification Result:\n';
        sorted.forEach((item, idx) => {
            const line = `${item.label}: ${(item.confidence * 100).toFixed(1)}%`;
            html += idx === 0 ? `**${line}**\n` : `${line}\n`;
        });
        // Render bold using <b> in a <pre> (works in most browsers)
        pre.innerHTML = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    } else {
        pre.textContent =
            typeof result === 'string' ? result : `Classification Result:\n${JSON.stringify(result, null, 2)}`;
    }
}

recorder.setClassifyHandler((d) => handleClassificationResult(d));
