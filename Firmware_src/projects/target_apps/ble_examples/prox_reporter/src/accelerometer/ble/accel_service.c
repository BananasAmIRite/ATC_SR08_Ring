#include "gattc_task.h"
#include "gattm_task.h"
#include "attm.h"
#include "att.h"
#include "attm_db.h"
#include "app.h"
#include "app_task.h"
#include "accel_service.h"
#include "arch.h"
#include "arch_console.h"
#include "../accelerometer.h"

// Custom UUIDs for accelerometer service (128-bit)
static const uint16_t accel_service_uuid = ATT_UUID_16(0x3000); // Little-endian
static const uint16_t accel_char_uuid = ATT_UUID_16(0x3A00);    // Little-endian

// Service handles (will be set when service is added)
static uint16_t accel_svc_start_hdl = 0;
static uint16_t accel_char_hdl = 0;
static uint8_t current_conidx = GAP_INVALID_CONIDX; 

// GATT attribute database
static const struct attm_desc accel_att_db[ACCEL_SVC_IDX_NB] = {
    // Service Declaration
    [ACCEL_SVC_IDX_SVC]  = {
        .uuid = ATT_DECL_PRIMARY_SERVICE, 
        .perm = PERM(RD, ENABLE), 
        // 0, 
        .max_size = 0
    },
    
    // Characteristic Declaration
    [ACCEL_SVC_IDX_CHAR] = {
        .uuid = ATT_DECL_CHARACTERISTIC, 
        .perm = PERM(RD, ENABLE), 
        // 0, 
        .max_size =  0x02 // ATT_CHAR_PROP_RD | ATT_CHAR_PROP_NTF
    },
    
    // Characteristic Value - accelerometer data (6 bytes: X,Y,Z as 16-bit each)
    [ACCEL_SVC_IDX_VAL]  = {
        .uuid = accel_char_uuid, 
        .perm = PERM(RD, ENABLE), 
        // PERM(RI, ENABLE), 
        .max_size = 6 | PERM(RI, DISABLE)
    },
    
    // Client Characteristic Configuration Descriptor
    // [ACCEL_SVC_IDX_CFG]  = {
    //     .uuid = ATT_DESC_CLIENT_CHAR_CFG, 
    //     .perm = PERM(RD, ENABLE) | PERM(WRITE_REQ, ENABLE), 
    //     // 0, 
    //     .max_size = 2
    // },
};

void accel_service_on_connect(uint8_t conidx) {
    current_conidx = conidx; 
    arch_printf("Accel service BLE connected. Connection ID: %d", current_conidx);
}

void accel_service_on_disconnect(void) {
    current_conidx = GAP_INVALID_CONIDX;
     arch_printf("Accel service BLE disconnected.");
}

uint16_t get_accel_char_hdl(void) {
    return accel_char_hdl; 
}

// TODO: hrps in sdk uses attm_svc_create_db to register to db; creates env to store everything
uint8_t accel_service_init(void)
{
    uint8_t status = attm_svc_create_db(&accel_svc_start_hdl,           // Handle output
                                        accel_service_uuid, // Service UUID
                                        NULL,                             // No secondary service
                                        ACCEL_SVC_IDX_NB,                 // Number of attributes
                                        NULL,                             // No attribute mask
                                        TASK_APP,                         // Task handling events
                                        accel_att_db,                     // Attribute database
                                        PERM(SVC_PRIMARY, ENABLE) | PERM(SVC_MI, DISABLE));           // Service permissions

    if (status == ATT_ERR_NO_ERROR) {
        // Service created successfully - calculate characteristic handle
        accel_char_hdl = accel_svc_start_hdl + ACCEL_SVC_IDX_VAL;
        
        arch_printf("Accelerometer service created successfully!\r\n");
        // arch_printf("  Service start handle: %d (0x%04X)\r\n", accel_svc_start_hdl, accel_svc_start_hdl);
        // arch_printf("  Characteristic handle: %d (0x%04X)\r\n", accel_char_hdl, accel_char_hdl);
        // arch_printf("  CCCD handle: %d (0x%04X)\r\n", 
        //            accel_svc_start_hdl + ACCEL_SVC_IDX_CFG, 
        //            accel_svc_start_hdl + ACCEL_SVC_IDX_CFG);
        return 0x00;
    } else {
        arch_printf("Failed to create accelerometer service (status: %d)\r\n", status);
        return status; 
    }
}

void send_ble_notification(uint16_t char_handle, uint8_t *data, uint16_t length)
{
    // Create notification message
    struct gattc_send_evt_cmd *cmd = KE_MSG_ALLOC_DYN(GATTC_SEND_EVT_CMD,
                                                       KE_BUILD_ID(TASK_GATTC, current_conidx),
                                                       TASK_APP,
                                                       gattc_send_evt_cmd, length);

    cmd->operation = GATTC_NOTIFY;        // Use GATTC_INDICATE for indications
    cmd->handle = char_handle;            // GATT characteristic handle
    cmd->length = length;                 // Data length
    memcpy(cmd->value, data, length);     // Copy your data

    ke_msg_send(cmd);
    
    arch_printf("Sent %d bytes via BLE notification\r\n", length);
}

void send_accel_data(accel_data_t *accel)
{
    uint8_t accel_bytes[6];
    accel_bytes[0] = (uint8_t)(accel->x & 0xFF);
    accel_bytes[1] = (uint8_t)((accel->x >> 8) & 0xFF);
    accel_bytes[2] = (uint8_t)(accel->y & 0xFF);
    accel_bytes[3] = (uint8_t)((accel->y >> 8) & 0xFF);
    accel_bytes[4] = (uint8_t)(accel->z & 0xFF);
    accel_bytes[5] = (uint8_t)((accel->z >> 8) & 0xFF);
    
    send_ble_notification(accel_char_hdl, accel_bytes, 6);
}

uint8_t update_accel_values(accel_data_t *accel) {
    uint8_t accel_bytes[6];
    accel_bytes[0] = (uint8_t)(accel->x & 0xFF);
    accel_bytes[1] = (uint8_t)((accel->x >> 8) & 0xFF);
    accel_bytes[2] = (uint8_t)(accel->y & 0xFF);
    accel_bytes[3] = (uint8_t)((accel->y >> 8) & 0xFF);
    accel_bytes[4] = (uint8_t)(accel->z & 0xFF);
    accel_bytes[5] = (uint8_t)((accel->z >> 8) & 0xFF);

    // Update the characteristic value
    return attmdb_att_set_value(accel_char_hdl, 6, 0, accel_bytes);
}