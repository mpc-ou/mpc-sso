export interface AppConfig {
  port: number;
  issuer: string;
  databaseUrl: string;
  jwtPrivateKey: string;
  jwtPublicKey: string;
  adminSecret: string;
  serviceApiKey: string;
  sessionSecret: string;
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function configuration(): AppConfig {
  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    issuer: requireEnv('ISSUER'),
    databaseUrl: requireEnv('DATABASE_URL'),
    jwtPrivateKey: requireEnv('JWT_PRIVATE_KEY'),
    jwtPublicKey: requireEnv('JWT_PUBLIC_KEY'),
    adminSecret: requireEnv('ADMIN_SECRET'),
    serviceApiKey: requireEnv('SERVICE_API_KEY'),
    sessionSecret: requireEnv('SESSION_SECRET'),
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? '',
    },
    smtp: {
      host: process.env.SMTP_HOST ?? '',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
      from: process.env.EMAIL_FROM ?? 'noreply@mpclub.dev',
    },
  };
}
