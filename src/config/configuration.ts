export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },

  shiftpilot: {
    baseUrl: process.env.SHIFTPILOT_BASE_URL ?? '',
    apiKey: process.env.SHIFTPILOT_API_KEY ?? '',
  },

  eric: {
    certPath: process.env.ERIC_CERT_PATH ?? '',
    certPassword: process.env.ERIC_CERT_PASSWORD ?? '',
    logPath: process.env.ERIC_LOG_PATH ?? '/tmp/eric-logs',
    env: (process.env.ERIC_ENV ?? 'test') as 'test' | 'production',
  },

  elstam: {
    baseUrl:
      process.env.ELSTAM_BASE_URL ??
      'https://www.elster.de/eportal/BuFA/MST/createLoginAndDo',
  },

  company: {
    steuernummer: process.env.COMPANY_STEUERNUMMER ?? '',
    bundesland: process.env.COMPANY_BUNDESLAND ?? 'NW',
    name: process.env.COMPANY_NAME ?? '',
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    bucket: process.env.S3_BUCKET ?? 'payslips',
    accessKey: process.env.S3_ACCESS_KEY ?? '',
    secretKey: process.env.S3_SECRET_KEY ?? '',
  },
});
