import axios, { AxiosInstance } from 'axios';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

// Example interface for type safety. In a real app, you'd define this more fully.
interface MarketTicker {
  symbol: string;
  price: string;
  // ... other properties from the Yellow API response
}

class YellowService {
  private apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create({
      baseURL: `https://api.yellow.org/v1`,
      headers: {
        'Authorization': `Bearer ${env.yellow.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info(`Yellow API client initialized for environment: ${env.yellow.environment}`);
  }

  /**
   * Fetches live market data for a given symbol from the Yellow Network API.
   * @param symbol - The market symbol, e.g., "btcusdt"
   */
  public async getMarketData(symbol: string): Promise<MarketTicker> {
    try {
      logger.info(`Fetching market data for symbol: ${symbol}`);
      const response = await this.apiClient.get<MarketTicker>(`/markets/${symbol}/ticker`);
      return response.data;
    } catch (error: unknown) {
      // ✅ Correct Pino structured logging
      logger.error(
        {
          err: error instanceof Error ? { message: error.message, stack: error.stack } : { error },
        },
        'Failed to fetch market data from Yellow API'
      );

      throw new Error('Could not fetch market data from Yellow Network.');
    }
  }

  /**
   * Places a trade order. Placeholder for a future feature.
   * @param orderData - The data for the order to be placed.
   */
  public async placeOrder(orderData?: unknown) {
    logger.info('placeOrder function is a placeholder and has not been implemented yet.');
    if (orderData) {
      logger.info({ orderData }, 'Received order data to process.');
    }
    return { success: true, message: 'Not implemented' };
  }
}

// Export a singleton instance to ensure only one client is created.
export const yellowService = new YellowService();
