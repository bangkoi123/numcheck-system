import AWS from 'aws-sdk';
import { stringify } from 'csv-stringify/sync';
import { logger } from '@numcheck/shared';

export class S3Exporter {
  private s3: AWS.S3;
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'numcheck-exports';
  }

  async initialize() {
    // Configure AWS SDK
    const s3Config: AWS.S3.ClientConfiguration = {
      region: process.env.AWS_REGION || 'us-east-1',
    };

    // For local development with MinIO
    if (process.env.S3_ENDPOINT) {
      s3Config.endpoint = process.env.S3_ENDPOINT;
      s3Config.s3ForcePathStyle = true;
      s3Config.accessKeyId = process.env.S3_ACCESS_KEY;
      s3Config.secretAccessKey = process.env.S3_SECRET_KEY;
    }

    this.s3 = new AWS.S3(s3Config);

    // Ensure bucket exists
    await this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      await this.s3.headBucket({ Bucket: this.bucket }).promise();
      logger.info(`S3 bucket ${this.bucket} exists`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        logger.info(`Creating S3 bucket ${this.bucket}`);
        await this.s3.createBucket({ Bucket: this.bucket }).promise();
      } else {
        throw error;
      }
    }
  }

  async uploadCsv(key: string, data: any[]): Promise<string> {
    try {
      // Convert data to CSV
      const csvContent = stringify(data, {
        header: true,
        columns: {
          e164: 'Phone Number',
          wa_status: 'WhatsApp Status',
          tg_status: 'Telegram Status',
          wa_checked_at: 'WhatsApp Checked At',
          tg_checked_at: 'Telegram Checked At',
          error: 'Error',
        },
      });

      // Upload to S3
      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: key,
        Body: csvContent,
        ContentType: 'text/csv',
        ContentDisposition: `attachment; filename="${key}"`,
      };

      const result = await this.s3.upload(uploadParams).promise();
      
      logger.info(`CSV uploaded to S3`, { key, location: result.Location });
      
      return result.Location;

    } catch (error) {
      logger.error({ err: error, key }, 'Failed to upload CSV to S3');
      throw error;
    }
  }

  async uploadJson(key: string, data: any): Promise<string> {
    try {
      const jsonContent = JSON.stringify(data, null, 2);

      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: key,
        Body: jsonContent,
        ContentType: 'application/json',
      };

      const result = await this.s3.upload(uploadParams).promise();
      
      logger.info(`JSON uploaded to S3`, { key, location: result.Location });
      
      return result.Location;

    } catch (error) {
      logger.error({ err: error, key }, 'Failed to upload JSON to S3');
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresIn,
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);
      
      logger.debug(`Generated signed URL for ${key}`, { expiresIn });
      
      return url;

    } catch (error) {
      logger.error({ err: error, key }, 'Failed to generate signed URL');
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key,
      }).promise();

      logger.info(`Deleted object from S3`, { key });

    } catch (error) {
      logger.error({ err: error, key }, 'Failed to delete object from S3');
      throw error;
    }
  }

  async listObjects(prefix?: string): Promise<AWS.S3.Object[]> {
    try {
      const params: AWS.S3.ListObjectsV2Request = {
        Bucket: this.bucket,
        Prefix: prefix,
      };

      const result = await this.s3.listObjectsV2(params).promise();
      
      return result.Contents || [];

    } catch (error) {
      logger.error({ err: error, prefix }, 'Failed to list objects from S3');
      throw error;
    }
  }
}
