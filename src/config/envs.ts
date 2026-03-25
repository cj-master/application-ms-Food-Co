import 'dotenv/config'
import * as Joi from 'joi'

interface EnvsVars {
  NATS_SERVER: string
  DATABASE_URL: string
  // CDN_URL: string

  JWT_ACCESS_SECRET: string
  JWT_REFRESH_SECRET: string
  JWT_ACCESS_EXPIRES_IN: string

  REDIS_URL: string

  R2_ENDPOINT: string
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
  R2_BUCKET: string
  R2_CDN_URL: string
}

// Definir esquema de variables de entornos
const envVarsSchema = Joi.object({
  NATS_SERVER: Joi.string().required(),
  DATABASE_URL: Joi.string().required(),
  // CDN_URL: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().required(),

  REDIS_URL: Joi.string().required(),

  R2_ENDPOINT: Joi.string().required(),
  R2_ACCESS_KEY_ID: Joi.string().required(),
  R2_SECRET_ACCESS_KEY: Joi.string().required(),
  R2_BUCKET: Joi.string().required(),
  R2_CDN_URL: Joi.string().required(),
}).unknown(true)

// Validar y asignar valores de variables de entorno
const { error, value } = envVarsSchema.validate({
  ...process.env
})

if (error) throw new Error(`Config validation error: ${error.message}`)
const envVars: EnvsVars = value

export const envs = {
  NATS_SERVER: envVars.NATS_SERVER,
  DATABASE_URL: envVars.DATABASE_URL,

  JWT_ACCESS_SECRET: envVars.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: envVars.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: envVars.JWT_ACCESS_EXPIRES_IN,

  REDIS_URL: envVars.REDIS_URL,

  R2_ENDPOINT: envVars.R2_ENDPOINT,
  R2_ACCESS_KEY_ID: envVars.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: envVars.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: envVars.R2_BUCKET,
  R2_CDN_URL: envVars.R2_CDN_URL
}