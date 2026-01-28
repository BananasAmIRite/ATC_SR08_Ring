import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import SoundMixer, { Device } from 'native-sound-mixer';
import { load, alias } from 'koffi';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
    app.quit();
}

alias('HWND', 'void *');
alias('HANDLE', 'void *');
alias('HMODULE', 'void *');
alias('LPCSTR', 'const char *'); // For function names ending in 'A'
alias('LPCWSTR', 'const char16_t *'); // For function names ending in 'W'
alias('BOOL', 'int');
alias('DWORD', 'uint32_t');

const user32 = load('user32.dll');

const GetForegroundWindow = user32.func('HWND __stdcall GetForegroundWindow()');

const ShowWindow = user32.func('bool __stdcall ShowWindow(HWND hWnd, int nCmdShow)');

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
        // Don't prevent default - this allows the native Chrome Bluetooth picker to appear
        event.preventDefault();
        if (deviceList.length === 0) return;

        const result = deviceList.find((device) => {
            return device.deviceName.includes('TEST'); // select device by name "TEST"
        });
        if (!result) {
            // The device wasn't found so we need to either wait longer (eg until the
            // device is turned on) or cancel the request by calling the callback
            // with an empty string.
            // callback('');
            return;
        } else {
            callback(result.deviceId);
        }
    });

    // handle volume controls
    ipcMain.on('volume-change', (event, val) => {
        const webContents = event.sender;

        SoundMixer.default.getDefaultDevice(0).volume = val;
    });

    ipcMain.on('minimize-foreground', (event) => {
        const hwnd = GetForegroundWindow();

        ShowWindow(hwnd, 6);
    });

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
