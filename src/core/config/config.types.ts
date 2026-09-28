export interface Config {
  PORT: number;
  NODE_ENV: 'development' | 'production';

  /**
   * Cookie secret
   */
  COOKIE_SECRET: string;

  /**
   * Health check options
   */
  HEALTH_CHECK_ENABLED?: boolean;

  /**
   * Throttler options
   */
  THROTTLE_GLOBAL_TTL?: number;
  THROTTLE_GLOBAL_LIMIT?: number;

  /**
   * PostgreSQL database options
   */
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
  POSTGRES_SYNCHRONIZE?: boolean;
  POSTGRES_LOGGING?: boolean;
  POSTGRES_MIGRATIONS_RUN?: boolean;

  /**
   * SMTP mail options
   */
  SMTP_URL: string;
  MAIL_FROM: string;

  /**
   * JWT options
   */
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL: number;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_TTL: number;

  /**
   * Local filesystem storage options
   */
  STORAGE_ROOT?: string;

  /**
   * Per-source-format upload size limits (bytes), per the file/image
   * transformation specs ("configured by an administrator separately for
   * each input format").
   */
  UPLOAD_MAX_SIZE_CSV_BYTES?: number;
  UPLOAD_MAX_SIZE_JSON_BYTES?: number;
  UPLOAD_MAX_SIZE_XML_BYTES?: number;
  UPLOAD_MAX_SIZE_YAML_BYTES?: number;
  UPLOAD_MAX_SIZE_PNG_BYTES?: number;
  UPLOAD_MAX_SIZE_JPEG_BYTES?: number;
  UPLOAD_MAX_SIZE_SVG_BYTES?: number;

  /**
   * Maximum output dimensions when rasterizing SVG to PNG/JPEG
   */
  MAX_RASTER_WIDTH?: number;
  MAX_RASTER_HEIGHT?: number;

  /**
   * Max age (ms) a temp file may linger before the startup sweep removes it
   * as orphaned (e.g. left behind by a crash mid-processing).
   */
  TEMP_FILE_MAX_AGE_MS?: number;

  /**
   * How long a saved transformation result (and its history record) is kept
   * before it's eligible for deletion, per the "history retention period"
   * spec (administrator-configurable, e.g. 90 days).
   */
  HISTORY_RETENTION_MS?: number;
}
