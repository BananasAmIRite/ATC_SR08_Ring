const connectButton = document.getElementById('connect');
const ledOnButton = document.getElementById('led-on');
const ledOffButton = document.getElementById('led-off');
const disconnectButton = document.getElementById('disconnect');
const startPlotButton = document.getElementById('start-plot');
const stopPlotButton = document.getElementById('stop-plot');

let device;
let server;
let service;
let characteristic;
let accelCharacteristic;
let plotInterval;
let chart;

const serviceUuid = '00112233-4455-6677-8899-aabbccddeeff';
const characteristicUuid = '2d86686a-53dc-25b3-0c4a-f0e10c8dee20';
const accelCharacteristicUuid = 'f2909165-4ce5-8da2-4c10-8b38c19f65cc'; // Reversed byte order for BLE

// Initialize Chart
const ctx = document.getElementById('accelChart').getContext('2d');
chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'X-axis',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                tension: 0.1,
            },
            {
                label: 'Y-axis',
                data: [],
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                tension: 0.1,
            },
            {
                label: 'Z-axis',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.1,
            },
        ],
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Acceleration',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Time',
                },
            },
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
            },
        },
    },
});

connectButton.addEventListener('click', async () => {
    try {
        if (!navigator.bluetooth) {
            console.error('Web Bluetooth API is not supported in this browser');
            alert('Web Bluetooth API is not supported in this browser');
            return;
        }

        console.log('Requesting Bluetooth devices...');
        device = await navigator.bluetooth.requestDevice({
            // acceptAllDevices: true,
            filters: [{ name: 'TEST' }],
            optionalServices: [serviceUuid],
        });

        console.log('Selected device:', device.name || 'Unknown');
        console.log('Device ID:', device.id);

        server = await device.gatt.connect();
        console.log('Connected to GATT server');

        service = await server.getPrimaryService(serviceUuid);
        console.log('Service found:', service.uuid);

        characteristic = await service.getCharacteristic(characteristicUuid);
        console.log('Characteristic found:', characteristic.uuid);

        // Try to get accelerometer characteristic
        try {
            accelCharacteristic = await service.getCharacteristic(accelCharacteristicUuid);
            console.log('Accelerometer characteristic found:', accelCharacteristic.uuid);
            startPlotButton.disabled = false;
        } catch (error) {
            console.warn('Accelerometer characteristic not found:', error);
            accelCharacteristic = null;
        }

        connectButton.disabled = true;
        ledOnButton.disabled = false;
        ledOffButton.disabled = false;
        disconnectButton.disabled = false;

        device.addEventListener('gattserverdisconnected', onDisconnected);
    } catch (error) {
        console.error('Error connecting to device:', error);
    }
});

ledOnButton.addEventListener('click', async () => {
    if (!characteristic) {
        return;
    }
    try {
        const data = new Uint8Array([1]);
        await characteristic.writeValue(data);
        console.log('Wrote 1 to characteristic');
    } catch (error) {
        console.error('Error writing to characteristic:', error);
    }
});

ledOffButton.addEventListener('click', async () => {
    if (!characteristic) {
        return;
    }
    try {
        const data = new Uint8Array([0]);
        await characteristic.writeValue(data);
        console.log('Wrote 0 to characteristic');
    } catch (error) {
        console.error('Error writing to characteristic:', error);
    }
});

disconnectButton.addEventListener('click', async () => {
    if (device && device.gatt.connected) {
        device.gatt.disconnect();
    } else {
        onDisconnected();
    }
});

function onDisconnected() {
    console.log('Disconnected from device');

    // Stop plotting if active
    if (plotInterval) {
        clearInterval(plotInterval);
        plotInterval = null;
    }

    device = null;
    server = null;
    service = null;
    characteristic = null;
    accelCharacteristic = null;

    connectButton.disabled = false;
    ledOnButton.disabled = true;
    ledOffButton.disabled = true;
    disconnectButton.disabled = true;
    startPlotButton.disabled = true;
    stopPlotButton.disabled = true;
}

startPlotButton.addEventListener('click', async () => {
    if (!accelCharacteristic) {
        console.error('Accelerometer characteristic not available');
        return;
    }

    startPlotButton.disabled = true;
    stopPlotButton.disabled = false;

    // Read accelerometer data every 2 seconds
    plotInterval = setInterval(async () => {
        try {
            const value = await accelCharacteristic.readValue();

            // Assuming the data is sent as 3 floats (12 bytes) or 3 int16 (6 bytes)
            // Adjust based on your firmware's data format
            let x, y, z;

            if (value.byteLength >= 12) {
                // Float format (4 bytes each)
                x = value.getFloat32(0, true); // true for little-endian
                y = value.getFloat32(4, true);
                z = value.getFloat32(8, true);
            } else if (value.byteLength >= 6) {
                // Int16 format (2 bytes each) - common for accelerometers
                x = value.getInt16(0, true) / 100.0; // Adjust scaling as needed
                y = value.getInt16(2, true) / 100.0;
                z = value.getInt16(4, true) / 100.0;
            } else {
                console.warn('Unexpected data length:', value.byteLength);
                return;
            }

            console.log(`Accel - X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}`);

            // Add data to chart
            const timestamp = new Date().toLocaleTimeString();
            chart.data.labels.push(timestamp);
            chart.data.datasets[0].data.push(x);
            chart.data.datasets[1].data.push(y);
            chart.data.datasets[2].data.push(z);

            // Keep only last 30 data points
            if (chart.data.labels.length > 30) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
                chart.data.datasets[2].data.shift();
            }

            chart.update('none'); // Update without animation for better performance
        } catch (error) {
            console.error('Error reading accelerometer data:', error);
        }
    }, 2000); // Read every 2 seconds
});

stopPlotButton.addEventListener('click', () => {
    if (plotInterval) {
        clearInterval(plotInterval);
        plotInterval = null;
        startPlotButton.disabled = false;
        stopPlotButton.disabled = true;
    }
});
