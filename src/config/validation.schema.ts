import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  SHIFTPILOT_BASE_URL: Joi.string().uri().required(),
  SHIFTPILOT_API_KEY: Joi.string().required(),

  ERIC_CERT_PATH: Joi.string().required(),
  ERIC_CERT_PASSWORD: Joi.string().required(),
  ERIC_LOG_PATH: Joi.string().default('/tmp/eric-logs'),
  ERIC_ENV: Joi.string().valid('test', 'production').default('test'),

  COMPANY_STEUERNUMMER: Joi.string().required(),
  COMPANY_BUNDESLAND: Joi.string().length(2).required(),
  COMPANY_NAME: Joi.string().required(),

  S3_ENDPOINT: Joi.string().uri().default('http://localhost:9000'),
  S3_BUCKET: Joi.string().default('payslips'),
  S3_ACCESS_KEY: Joi.string().required(),
  S3_SECRET_KEY: Joi.string().required(),
});
