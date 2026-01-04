/**
 * API Response Wrapper Utility
 * Standardizes all API responses with ackStatus, ackCode, ackMessage, and data
 */

class ApiResponse {
    constructor(ackCode, ackStatus, ackMessage, data = null) {
        this.ackCode = ackCode;
        this.ackStatus = ackStatus;
        this.ackMessage = ackMessage;
        this.data = data;
    }
}

/**
 * Success Response
 * @param {number} ackCode - HTTP status code
 * @param {string} ackMessage - Success message
 * @param {any} data - Response data
 * @returns {ApiResponse}
 */
const sendSuccess = (ackCode = 200, ackMessage = 'Success', data = null) => {
    return new ApiResponse(ackCode, 'SUCCESS', ackMessage, data);
};

/**
 * Error Response
 * @param {number} ackCode - HTTP status code
 * @param {string} ackMessage - Error message
 * @param {any} data - Additional error data (optional)
 * @returns {ApiResponse}
 */
const sendError = (ackCode = 400, ackMessage = 'Error', data = null) => {
    return new ApiResponse(ackCode, 'ERROR', ackMessage, data);
};

module.exports = {
    ApiResponse,
    sendSuccess,
    sendError,
};
