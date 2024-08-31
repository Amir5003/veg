// models/tokenBlacklistModel.js
const mongoose = require('mongoose');

const tokenBlacklistSchema = mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
    },
});

const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema);

module.exports = TokenBlacklist;
