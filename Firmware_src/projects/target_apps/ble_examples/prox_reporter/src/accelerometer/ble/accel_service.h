#ifndef _ACCEL_SVC_H_
#define _ACCEL_SVC_H_

#include "gattc_task.h"
#include "gattm_task.h"
#include "../accelerometer.h"
#include "app.h"
#include "app_task.h"



// Service database structure
enum accel_svc_att_idx {
    ACCEL_SVC_IDX_SVC,                  // Service declaration
    ACCEL_SVC_IDX_CHAR,                 // Characteristic declaration
    ACCEL_SVC_IDX_VAL,                  // Characteristic value
    ACCEL_SVC_IDX_CFG,                  // Client characteristic configuration (for notifications)
    ACCEL_SVC_IDX_NB,
};

// TODO: add to user_proxr user_app_on_connect() func
void accel_service_on_connect(uint8_t conidx);

// TODO: add to user_proxr user_app_on_disconnect() func
void accel_service_on_disconnect(void);

// TODO: add to user_proxr user_app_on_init() func
void accel_service_init(void);

void send_ble_notification(uint16_t char_handle, uint8_t *data, uint16_t length);

void send_accel_data(accel_data_t *accel);

#endif