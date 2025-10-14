#include "accelerometer.h"
#include "i2c.h"
#include "arch_console.h"

// I2C configuration for SC7A20
static const i2c_cfg_t sc7a20_i2c_cfg = {
    .clock_cfg = {
        .ss_hcnt = I2C_SS_SCL_HCNT_REG_RESET,
        .ss_lcnt = I2C_SS_SCL_LCNT_REG_RESET,
        .fs_hcnt = I2C_FS_SCL_HCNT_REG_RESET,
        .fs_lcnt = I2C_FS_SCL_LCNT_REG_RESET,
    },
    .restart_en = I2C_RESTART_ENABLE,
    .speed = I2C_SPEED_FAST,        // 400 kHz
    .mode = I2C_MODE_MASTER,
    .addr_mode = I2C_ADDRESSING_7B,
    .address = 0x18, // SC7A20 i2c addr
    .tx_fifo_level = 16,
    .rx_fifo_level = 16,
};

bool accel_init(void) {
    i2c_init(&sc7a20_i2c_cfg);

    // config accelerometer
    uint8_t abort_code;
    uint8_t config[2] = {0x20, 0b01010111}; // ctrl reg 1, 0101 = 100hz, 0 = sleep, 111 = enable xyz
    i2c_master_transmit_buffer_sync(config, sizeof(uint8_t)*2, &abort_code, I2C_F_NONE);

    if (abort_code != I2C_ABORT_NONE) {
        arch_printf("Accelerometer Configuration failed, error: %d\r\n", abort_code);
        return false;
    }

    arch_printf("Accelerometer Initialized successfully");
    return true;
}

uint8_t accel_cmd_whoami(void) {
    uint8_t whoami_addr = 0x0F; // whoami addr 
    i2c_abort_t abort_code;
    i2c_master_transmit_buffer_sync(&whoami_addr, 1, &abort_code, I2C_F_NONE); 

    if (abort_code != I2C_ABORT_NONE) {
        arch_printf("SC7A20: I2C write failed, error: %d\r\n", abort_code);
        return -1;
    }

    uint8_t res;
    
    i2c_master_receive_buffer_sync(&res, 1, &abort_code, I2C_F_WAIT_FOR_STOP);
    if (abort_code != I2C_ABORT_NONE) {
        arch_printf("SC7A20: I2C read failed, error: %d\r\n", abort_code);
        return -1;
    }

    return res; 
}

bool accel_cmd_readaccel(accel_data_t *accel_out) {
    i2c_abort_t abort_code; 
    uint8_t accel_raw[6]; // X_LOW, X_HIGH, Y_LOW, Y_HIGH, Z_LOW, Z_HIGH
    uint8_t addr = 0x28 | 0b10000000; // X_LOW + batch read
    i2c_master_transmit_buffer_sync(&addr, 1, &abort_code, I2C_F_NONE);

    if (abort_code != I2C_ABORT_NONE) {
        arch_printf("Error when reading acceleration: %d", abort_code);
        return false; 
    }

    i2c_master_receive_buffer_sync(accel_raw, 6, &abort_code, I2C_F_WAIT_FOR_STOP);
    if (abort_code != I2C_ABORT_NONE) {
        arch_printf("Error when reading acceleration: %d", abort_code);
        return false;
    }

    // compute actual accelerations
    uint16_t accel_x = (uint16_t)((accel_raw[1] << 8) | accel_raw[0]); // X_HIGH concatenated with X_LOW
    uint16_t accel_y = (uint16_t)((accel_raw[3] << 8) | accel_raw[2]); // Y_HIGH concatenated with U_LOW
    uint16_t accel_z = (uint16_t)((accel_raw[5] << 8) | accel_raw[4]); // Z_HIGH concatenated with Z_LOW

    accel_out->x = accel_x; 
    accel_out->y = accel_y; 
    accel_out->z = accel_z;

    return true;
}