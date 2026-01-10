/**
 ****************************************************************************************
 *
 * @file user_custs1_impl.c
 *
 * @brief Custom 1 server implementation
 *
 * Copyright (C) 2012-2021 Renesas Electronics Corporation and/or its affiliates
 * The MIT License (MIT)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
 * OR OTHER DEALINGS IN THE SOFTWARE.
 ****************************************************************************************
 */

/**
 ****************************************************************************************
 * @addtogroup USER_APP
 * @{
 ****************************************************************************************
 */

/*
 * INCLUDE FILES
 ****************************************************************************************
 */

#include "user_custs1_impl.h"
#include "user_custs1_def.h"
#include "user_proxr.h"
#include "custs1_task.h"
#include "app_task.h"
#include "ke_msg.h"
#include "accelerometer.h"
#include "attm_db.h"
#include "custs1.h"
#include "app.h"
#include "prf_utils.h"
#include <string.h>

/*
 * EXTERNAL VARIABLE DECLARATIONS
 ****************************************************************************************
 */
extern uint32_t led_value;

/*
 * FUNCTION DEFINITIONS
 ****************************************************************************************
 */
#if (BLE_CUSTOM1_SERVER)

void user_custs1_wr_ind_handler(ke_msg_id_t const msgid,
                                     struct custs1_val_write_ind const *param,
                                     ke_task_id_t const dest_id,
                                     ke_task_id_t const src_id)
{
	if (param->handle == SVC1_IDX_CTRL_POINT_VAL)
	{
		if(param->value[0] != 0)
		{
			// Turn on the LED
			LED_GPIO_mode(1);
			led_value = 123;
		} else {
			LED_GPIO_mode(0);
		}
	}
}

void update_accel_data(const accel_data_t *accel_data)
{
    // Prepare data buffer (6 bytes)
    uint8_t data_buffer[6];
    
    if (accel_data != NULL) {
        // Pack real accelerometer data (big-endian format)
        data_buffer[0] = accel_data->x >> 8;
        data_buffer[1] = accel_data->x & 0xFF;
        data_buffer[2] = accel_data->y >> 8;
        data_buffer[3] = accel_data->y & 0xFF;
        data_buffer[4] = accel_data->z >> 8;
        data_buffer[5] = accel_data->z & 0xFF;
    } else {
        // Send test data if no accelerometer data provided
        data_buffer[0] = 0x01;
        data_buffer[1] = 0x02;
        data_buffer[2] = 0x03;
        data_buffer[3] = 0x04;
        data_buffer[4] = 0x05;
        data_buffer[5] = 0x06;
    }
    
    // // This sends a message to the CUSTS1 task, which will call attmdb_att_set_value()
    // // in the correct task context (not from timer interrupt context)
    // struct custs1_val_set_req *req = KE_MSG_ALLOC_DYN(CUSTS1_VAL_SET_REQ,
    //                                                    TASK_ID_CUSTS1,
    //                                                    TASK_APP,
    //                                                    custs1_val_set_req,
    //                                                    6);
    
    // if (req == NULL) {
    //     return; // Allocation failed
    // }
    
    // // Set the message parameters
    // req->conidx = 0;  // Connection index (0 for first/only connection)
    // req->handle = SVC1_IDX_ACCEL_VAL;
    // req->length = 6;
    
    // // Copy data to message
    // memcpy(req->value, data_buffer, 6);
    
    // // Send the message - CUSTS1 task will process it safely
    // ke_msg_send(req);

      struct custs1_val_set_req *req = KE_MSG_ALLOC_DYN(CUSTS1_VAL_SET_REQ,
                                                    prf_get_task_from_id(TASK_ID_CUSTS1),
                                                    TASK_APP,
                                                    custs1_val_set_req,
                                                    6);

        req->handle = SVC1_IDX_ACCEL_VAL;
        req->length = 6;
        memcpy(req->value, data_buffer, 6);

        ke_msg_send(req);
}

#endif //BLE_CUSTOM1_SERVER