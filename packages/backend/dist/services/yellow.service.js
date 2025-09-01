"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.yellowService = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../config/environment");
const logger_1 = require("../utils/logger");
class YellowService {
    apiClient;
    constructor() {
        this.apiClient = axios_1.default.create({
            baseURL: `https://api.yellow.org/v1`,
            headers: {
                'Authorization': `Bearer ${environment_1.env.yellow.apiKey}`,
                'Content-Type': 'application/json',
            },
        });
        logger_1.logger.info(`Yellow API client initialized for environment: ${environment_1.env.yellow.environment}`);
    }
    /**
     * Fetches live market data for a given symbol from the Yellow Network API.
     * @param symbol - The market symbol, e.g., "btcusdt"
     */
    async getMarketData(symbol) {
        try {
            logger_1.logger.info(`Fetching market data for symbol: ${symbol}`);
            const response = await this.apiClient.get(`/markets/${symbol}/ticker`);
            return response.data;
        }
        catch (error) {
            // ✅ Correct Pino structured logging
            logger_1.logger.error({
                err: error instanceof Error ? { message: error.message, stack: error.stack } : { error },
            }, 'Failed to fetch market data from Yellow API');
            throw new Error('Could not fetch market data from Yellow Network.');
        }
    }
    /**
     * Places a trade order. Placeholder for a future feature.
     * @param orderData - The data for the order to be placed.
     */
    async placeOrder(orderData) {
        logger_1.logger.info('placeOrder function is a placeholder and has not been implemented yet.');
        if (orderData) {
            logger_1.logger.info({ orderData }, 'Received order data to process.');
        }
        return { success: true, message: 'Not implemented' };
    }
}
// Export a singleton instance to ensure only one client is created.
exports.yellowService = new YellowService();
//# sourceMappingURL=yellow.service.js.map