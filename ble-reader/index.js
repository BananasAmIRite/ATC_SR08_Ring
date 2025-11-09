async function scanForBLEDevices() {
    // Check if Web Bluetooth is supported
    if (!navigator.bluetooth) {
        console.error('Web Bluetooth API is not supported in this browser');
        return;
    }

    let device;

    try {
        console.log('Requesting Bluetooth devices...');

        // Request devices - this will show a device picker dialog
        device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
                'generic_access', // 0x1800
                'generic_attribute', // 0x1801
                'device_information', // 0x180A
                'battery_service', // 0x180F
                'heart_rate', // 0x180D
                'health_thermometer', // 0x1809
                'environmental_sensing', // 0x181A
                '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
                '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
                '0000180a-0000-1000-8000-00805f9b34fb',
                0x3000,
                0x3a00,
            ], // Add specific service UUIDs if you know them
        });

        console.log('Selected device:', device.name || 'Unknown');
        console.log('Device ID:', device.id);

        // Connect to the device
        const server = await device.gatt.connect();
        console.log('Connected to GATT server');

        // Get primary services
        const services = await server.getPrimaryServices();
        console.log('Available services:', services);

        // services.forEach(service => {
        //     console.log('Service UUID:', service.uuid);
        // });

        const accelSvc = await server.getPrimaryService(0x3000);

        console.log(accelSvc);

        console.log(await accelSvc.getCharacteristics());

        const accelChar = await accelSvc.getCharacteristic(0x3a00);

        console.log(accelChar.value);

        // await accelChar.startNotifications();

        // accelChar.addEventListener('characteristicvaluechanged', (a) => {
        //     console.log(a);
        // });

        // // Disconnect when done
        device.gatt.disconnect();
        console.log('Disconnected from device');
    } catch (error) {
        console.error('Error scanning for devices:', error);
        console.error(error.stack);

        device.gatt.disconnect();
        console.log('Disconnected from device');
    }
}

document.getElementById('scan').addEventListener('click', () => scanForBLEDevices());
