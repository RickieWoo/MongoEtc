let winston = require('winston');

winston.loggers.add('InventoryLogger', {
    console: {
        colorize: 'true',
        label: 'InventoryLogger'
    },
    file: {
        colorize: 'true',
        filename: './logs/inventory.log',
        maxsize: 5242880,
        maxFiles: 20
    }
});

winston.loggers.add('BossUserLogger', {
    console: {
        colorize: 'true',
        label: 'BossUserLogger'
    },
    file: {
        colorize: 'true',
        filename: './logs/bossuser.log',
        maxsize: 5242880,
        maxFiles: 20
    }
});

winston.loggers.add('UserLogger', {
    console: {
        colorize: 'true',
        label: 'UserLogger'
    },
    file: {
        colorize: 'true',
        filename: './logs/user.log',
        maxsize: 5242880,
        maxFiles: 20
    }
});

winston.loggers.add('AuthorizationLogger', {
    console: {
        colorize: 'true',
        label: 'AuthorizationLogger'
    },
    file: {
        colorize: 'true',
        filename: './logs/authorization.log',
        maxsize: 5242880,
        maxFiles: 20
    }
});

winston.loggers.add('DeliveryLogger', {
    console: {
        colorize: 'true',
        label: 'DeliveryLogger'
    },
    file: {
        colorize: 'true',
        filename: './logs/delivery.log',
        maxsize: 5242880,
        maxFiles: 20
    }
});

winston.loggers.add('RecordLogger', {
    console: {
        colorize: 'true',
        label: 'RecordLogger'
    },
    file: {
        colorize: 'true',
        filename: './logs/record.log',
        maxsize: 5242880,
        maxFiles: 20
    }
});

winston.loggers.add('AGCODLogger', {
    console: {
        colorize: 'true',
        label: 'AGCODLogger'
    },
    file: {
        colorize: 'true',
        filename: './logs/agcod.log',
        maxsize: 5242880,
        maxFiles: 20
    }
});

winston.loggers.add('AGCODCriticalErrorLogger', {
    console: {
        colorize: 'true',
        label: 'AGCODCriticalErrorLogger'
    },
    file: {
        colorize: 'true',
        filename: './logs/agcod_critical_error.log',
        maxsize: 5242880,
        maxFiles: 20
    }
});

winston.loggers.add('MailLogger', {
    console: {
        colorize: 'true',
        label: 'MailLogger'
    },
    file: {
        colorize: 'true',
        filename: './logs/mail.log',
        maxsize: 5242880,
        maxFiles: 20
    }
});
winston.loggers.add('StatisticsLogger', {
    console: {
        colorize: 'true',
        label: 'StatisticsLogger'
    },
    file: {
        colorize: 'true',
        filename: './logs/statistics.log',
        maxsize: 5242880,
        maxFiles: 20
    }
});

