import Joi from 'joi';

import { Config } from './config.types';

export const configValidationSchema = Joi.object<Config>({
  PORT: Joi.number().port().required(),
  NODE_ENV: Joi.string().valid('development', 'production').required(),

  /**
   * Cookie secret
   */
  COOKIE_SECRET: Joi.string().required(),

  /**
   * Health check options
   */
  HEALTH_CHECK_ENABLED: Joi.boolean().optional().default(false),

  /**
   * Throttler options
   */
  THROTTLE_GLOBAL_TTL: Joi.number().optional().default(10000),
  THROTTLE_GLOBAL_LIMIT: Joi.number().optional().default(10),

  /**
   * PostgreSQL database options
   */
  POSTGRES_HOST: Joi.string().hostname().required(),
  POSTGRES_PORT: Joi.number().port().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_LOGGING: Joi.boolean().optional().default(false),
  POSTGRES_MIGRATIONS_RUN: Joi.boolean().optional().default(false),

  /**
   * SMTP mail options
   */
  // Not a strict URI check: SMTP credentials are commonly email addresses,
  // whose unescaped "@" in the userinfo segment fails RFC 3986 validation
  // even though nodemailer's own (lenient) URL parsing handles it fine.
  SMTP_URL: Joi.string()
    .pattern(/^smtps?:\/\//)
    .required(),
  MAIL_FROM: Joi.string().required(),

  /**
   * JWT options (TTLs are in seconds)
   */
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_TTL: Joi.number().optional().default(900),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_TTL: Joi.number().optional().default(604800),

  /**
   * Local filesystem storage options
   */
  STORAGE_ROOT: Joi.string().optional().default('./storage'),

  /**
   * Per-source-format upload size limits (bytes)
   */
  UPLOAD_MAX_SIZE_CSV_BYTES: Joi.number().optional().default(10_485_760),
  UPLOAD_MAX_SIZE_JSON_BYTES: Joi.number().optional().default(10_485_760),
  UPLOAD_MAX_SIZE_XML_BYTES: Joi.number().optional().default(10_485_760),
  UPLOAD_MAX_SIZE_YAML_BYTES: Joi.number().optional().default(10_485_760),
  UPLOAD_MAX_SIZE_PNG_BYTES: Joi.number().optional().default(15_728_640),
  UPLOAD_MAX_SIZE_JPEG_BYTES: Joi.number().optional().default(15_728_640),
  UPLOAD_MAX_SIZE_SVG_BYTES: Joi.number().optional().default(2_097_152),

  /**
   * Maximum output dimensions when rasterizing SVG to PNG/JPEG
   */
  MAX_RASTER_WIDTH: Joi.number().optional().default(10_000),
  MAX_RASTER_HEIGHT: Joi.number().optional().default(10_000),

  /**
   * Temp file cleanup
   */
  TEMP_FILE_MAX_AGE_MS: Joi.number().optional().default(86_400_000),

  /**
   * Transformation history / saved-result retention period (ms)
   */
  HISTORY_RETENTION_MS: Joi.number()
    .optional()
    .default(90 * 24 * 60 * 60 * 1000),
});
