#include "i2c.h"

typedef struct {
    int16_t x; 
    int16_t y;
    int16_t z;
} accel_data_t; 

bool accel_init(void);

uint8_t accel_cmd_whoami(void);

bool accel_cmd_readaccel(accel_data_t *accel_out);