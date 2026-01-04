const { sendError } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    res.status(statusCode).json(
        sendError(
            statusCode,
            err.message || 'Internal Server Error',
            process.env.NODE_ENV === 'production' ? null : err.stack
        )
    );
};

module.exports = errorHandler;
