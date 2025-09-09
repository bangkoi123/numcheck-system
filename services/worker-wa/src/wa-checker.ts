import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger, exponentialBackoff, sleep } from '@numcheck/shared';

export interface WACheckResult {
  status: 'registered' | 'not_registered' | 'business_active' | 'unknown';
  meta?: Record<string, any>;
}

export class WhatsAppChecker {
  private readonly stage1Timeout = 5000; // 5 seconds
  private readonly stage2Timeout = 10000; // 10 seconds
  private readonly maxRetries = 3;

  async checkStage1(e164: string): Promise<WACheckResult> {
    try {
      logger.debug(`Starting Stage 1 check for ${e164}`);
      
      // Remove + from E.164 format for wa.me URL
      const phoneNumber = e164.replace('+', '');
      const waUrl = `https://wa.me/${phoneNumber}`;

      const response = await axios.head(waUrl, {
        timeout: this.stage1Timeout,
        maxRedirects: 5,
        validateStatus: () => true, // Accept all status codes
      });

      // Analyze response for business account indicators
      const finalUrl = response.request?.res?.responseUrl || waUrl;
      const statusCode = response.status;

      logger.debug(`Stage 1 response for ${e164}`, {
        statusCode,
        finalUrl,
        headers: response.headers,
      });

      // Heuristic analysis
      if (statusCode === 200) {
        // Check if redirected to business profile
        if (finalUrl.includes('business') || 
            response.headers['x-wa-business'] ||
            response.headers['x-whatsapp-business']) {
          return {
            status: 'business_active',
            meta: {
              stage: 1,
              method: 'heuristic',
              finalUrl,
              statusCode,
            },
          };
        }
      }

      // If we can't determine conclusively, return unknown for Stage 2
      return {
        status: 'unknown',
        meta: {
          stage: 1,
          method: 'heuristic',
          finalUrl,
          statusCode,
          reason: 'inconclusive',
        },
      };

    } catch (error) {
      logger.warn(`Stage 1 check failed for ${e164}`, { error: error.message });
      
      return {
        status: 'unknown',
        meta: {
          stage: 1,
          method: 'heuristic',
          error: error.message,
        },
      };
    }
  }

  async checkStage2(e164: string): Promise<WACheckResult> {
    const apiKey = process.env.NUMCHECK_API_KEY;
    
    if (!apiKey) {
      logger.error('NUMCHECK_API_KEY not configured');
      return {
        status: 'unknown',
        meta: {
          stage: 2,
          method: 'api',
          error: 'API key not configured',
        },
      };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        logger.debug(`Starting Stage 2 check for ${e164} (attempt ${attempt + 1})`);

        const response = await axios.post(
          'https://api.numbercheck.ai/v1/whatsapp/check',
          {
            phone_number: e164,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: this.stage2Timeout,
          }
        );

        const data = response.data;
        
        logger.debug(`Stage 2 response for ${e164}`, { data });

        // Map NumberCheck.ai response to our format
        let status: WACheckResult['status'] = 'unknown';
        
        if (data.whatsapp?.registered === true) {
          status = 'registered';
        } else if (data.whatsapp?.registered === false) {
          status = 'not_registered';
        }

        return {
          status,
          meta: {
            stage: 2,
            method: 'api',
            provider: 'numbercheck.ai',
            response: data,
          },
        };

      } catch (error) {
        lastError = error as Error;
        logger.warn(`Stage 2 check attempt ${attempt + 1} failed for ${e164}`, {
          error: error.message,
        });

        // Handle rate limiting
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : exponentialBackoff(attempt);
          
          logger.info(`Rate limited, waiting ${delay}ms before retry`);
          await sleep(delay);
          continue;
        }

        // Handle other 4xx errors (don't retry)
        if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
          break;
        }

        // Exponential backoff for retryable errors
        if (attempt < this.maxRetries - 1) {
          const delay = exponentialBackoff(attempt);
          await sleep(delay);
        }
      }
    }

    return {
      status: 'unknown',
      meta: {
        stage: 2,
        method: 'api',
        provider: 'numbercheck.ai',
        error: lastError?.message || 'Unknown error',
        attempts: this.maxRetries,
      },
    };
  }

  async checkQuick(e164: string): Promise<WACheckResult> {
    // For quick checks, try Stage 1 first, then Stage 2 if needed
    const stage1Result = await this.checkStage1(e164);
    
    if (stage1Result.status !== 'unknown') {
      return stage1Result;
    }

    // Only use Stage 2 for quick checks if explicitly enabled
    if (process.env.USE_WA_STAGE2_FOR_QUICK === 'true') {
      return this.checkStage2(e164);
    }

    return stage1Result;
  }
}
