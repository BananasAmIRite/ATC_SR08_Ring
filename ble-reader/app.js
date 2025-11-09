const noble = require('@abandonware/noble');

// Wait for Bluetooth adapter to be ready
noble.on('stateChange', (state) => {
    console.log('Bluetooth adapter state:', state);

    if (state === 'poweredOn') {
        console.log('Starting BLE scan...');
        noble.startScanning(
            [
                // 'generic_access', // 0x1800
                // 'generic_attribute', // 0x1801
                // 'device_information', // 0x180A
                // 'battery_service', // 0x180F
                // 'heart_rate', // 0x180D
                // 'health_thermometer', // 0x1809
                // 'environmental_sensing', // 0x181A
                // '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
                // '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
                // '0000180a-0000-1000-8000-00805f9b34fb',
                'fef5',
            ],
            false
        ); // Scan for all devices, don't allow duplicates
    } else {
        console.log('Stopping scan...');
        noble.stopScanning();
    }
});

// Handle discovered devices
noble.on('discover', async (peripheral) => {
    // if (peripheral.advertisement.localName != 'TEST') return;
    console.log('\n--- Device Found ---');
    console.log('Address:', peripheral.address);
    console.log('Local Name:', peripheral.advertisement.localName || 'Unknown');
    console.log('RSSI:', peripheral.rssi);
    console.log('Connectable:', peripheral.connectable);

    // Log manufacturer data if available
    if (peripheral.advertisement.manufacturerData) {
        console.log('Manufacturer Data:', peripheral.advertisement.manufacturerData.toString('hex'));
    }

    // // Log service UUIDs if available
    if (peripheral.advertisement.serviceUuids && peripheral.advertisement.serviceUuids.length > 0) {
        console.log('Service UUIDs:', peripheral.advertisement.serviceUuids);
    }

    await peripheral.connectAsync();
    console.log('Connected');

    const { services, characteristics } = await peripheral.discoverAllServicesAndCharacteristicsAsync();

    // Find the service with UUID 0x3000
    const targetService = services.find((service) => service.uuid === '3000');

    if (!targetService) {
        console.log('Service 0x3000 not found');
        await peripheral.disconnectAsync();
        return;
    }

    console.log('Found service 0x3000');

    // Find the characteristic with UUID 0x3a00
    const targetCharacteristic = characteristics.find((char) => char._serviceUuid === '3000' && char.uuid === '3a00');

    if (!targetCharacteristic) {
        console.log('Characteristic 0x3a00 not found in service 0x3000');
        await peripheral.disconnectAsync();
        return;
    }

    console.log('Found characteristic 0x3a00');
    console.log('Characteristic properties:', targetCharacteristic.properties);

    if (targetCharacteristic.properties.includes('read')) {
        const data = await new Promise((resolve, reject) => {
            targetCharacteristic.read((error, data) => {
                if (error) reject(error);
                else resolve(data);
            });
        });

        console.log(`data: ${data}`);
    } else {
        console.log('Characteristic does not support read operation');
    }

    await peripheral.disconnectAsync();
});

// Handle scan start
noble.on('scanStart', () => {
    console.log('BLE scan started successfully');
});

// Handle scan stop
noble.on('scanStop', () => {
    console.log('BLE scan stopped');
});

// Stop scanning after 10 seconds
setTimeout(() => {
    console.log('\nStopping scan...');
    noble.stopScanning();
    process.exit(0);
}, 20000);
