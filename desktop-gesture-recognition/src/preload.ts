// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    setSystemVolume: (volume: number) => ipcRenderer.send('volume-change', volume),
    incrementSystemVolume: (amount: number) => ipcRenderer.send('volume-increment', amount),
    minimizeForegroundWindow: () => ipcRenderer.send('minimize-foreground'),
    maximizeForegroundWindow: () => ipcRenderer.send('maximize-foreground'),
});
