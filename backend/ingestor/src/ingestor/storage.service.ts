import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    const endpoint = this.configService.get<string>('AWS_ENDPOINT');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';

    this.logger.log(`Initializing S3 client with endpoint: ${endpoint} and region: ${region} and accessKeyId: ${accessKeyId} and secretAccessKey: ${secretAccessKey}`);

    this.s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
      tls: false,
      maxAttempts: 3,
      requestHandler: {
        connectionTimeout: 5000,
        socketTimeout: 5000,
      },
    });
  }

  async listFiles(bucket: string, prefix?: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);
      return (response.Contents || [])
        .map(object => object.Key || '')
        .filter(key => key.endsWith('.json.gz')); // Only process gzipped JSON files
    } catch (error) {
      this.logger.error(`Error listing files from S3: ${error.message}`);
      throw error;
    }
  }

  async getFileContent(bucket: string, key: string): Promise<string> {
    try {
      this.logger.log(`Getting file content for ${bucket}/${key}`);
      
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const stream = response.Body as Readable;
      const gunzip = createGunzip();

      // Add error handlers to the gunzip stream
      gunzip.on('error', (err) => {
        this.logger.error(`Gunzip error for ${bucket}/${key}: ${err.message}`);
        throw err;
      });

      let data = '';
      await pipeline(
        stream,
        gunzip,
        async (source) => {
          for await (const chunk of source) {
            data += chunk.toString();
          }
        }
      );

      // Verify we got some data
      if (!data) {
        throw new Error('No data was decompressed from the file');
      }

      return data;
    } catch (error) {
      this.logger.error(`Error getting file content from S3 for ${bucket}/${key}: ${error.message}`);
      if (error.name === 'ZlibError') {
        this.logger.error(`Gzip decompression failed. The file might be corrupted or not a valid gzip file.`);
      }
      throw error;
    }
  }

  async getFileSize(bucket: string, key: string): Promise<number> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return response.ContentLength || 0;
    } catch (error) {
      this.logger.error(`Error getting file size from S3: ${error.message}`);
      throw error;
    }
  }

  async getFileDetails(bucket: string, key: string): Promise<{ lastModified: Date }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      const response = await this.s3Client.send(command);

      if (!response.LastModified) {
        throw new Error(`No last modified date found for ${bucket}/${key}`);
      }

      return {
        lastModified: response.LastModified,
      };
    } catch (error) {
      this.logger.error(`Error getting file details for ${bucket}/${key}: ${error.message}`);
      throw error;
    }
  }
} 