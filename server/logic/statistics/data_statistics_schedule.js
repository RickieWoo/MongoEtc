'use strict';

let StatisticsLogic = require('./data_statistics_logic');
let logger = require('winston').loggers.get('StatisticsLogger');

function _deliveryStatistics() {
    let lastHour = new Date(Date.now() - (1000 * 60 * 60)).toISOString();   // statistics of last hour
    StatisticsLogic.updateOneHourDeliveryStatistics({
        dimension: lastHour
    })
        .then(result => {
            logger.info(`[Statistics] success at ${lastHour}`);
        })
        .catch(err => {
            logger.error(`[Statistics] error at ${lastHour} => ${err.stack}`);
        })
}

/* =========================== Main Start ========================== */
if (typeof require !== 'undefined' && require.main === module) {
    setInterval(_deliveryStatistics, 1000 * 60 * 60);
}
/* =========================== Main End ========================== */