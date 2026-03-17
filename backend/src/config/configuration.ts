export interface DatabaseConfig {
  uri: string;
}

export interface AzureConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface OpenAiConfig {
  apiKey: string;
  model: string;
  whisperModel: string;
  maxRecordingSize: number;
}

export interface EncryptionConfig {
  key: string;
  iv: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  botCallbackUrl: string;
  database: DatabaseConfig;
  azure: AzureConfig;
  jwt: JwtConfig;
  openai: OpenAiConfig;
  encryption: EncryptionConfig;
  rateLimit: RateLimitConfig;
  logLevel: string;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  botCallbackUrl: process.env.BOT_CALLBACK_URL || 'https://351f-115-186-174-60.ngrok-free.app/api/meeting-bot/callback',
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/teams-meeting-summary',
  },
  azure: {
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    tenantId: process.env.AZURE_TENANT_ID || '',
    redirectUri: process.env.AZURE_REDIRECT_URI || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '24h',
    refreshExpiresIn: '7d',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4o',
    whisperModel: process.env.OPENAI_WHISPER_MODEL || 'whisper-1',
    maxRecordingSize: parseInt(process.env.MAX_RECORDING_SIZE_MB || '500', 10) * 1024 * 1024,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '',
    iv: process.env.ENCRYPTION_IV || '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  logLevel: process.env.LOG_LEVEL || 'debug',
});
