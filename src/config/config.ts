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
  selfClient: {
    clientId: string;
    clientSecret: string;
  };
  discord: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  resend: {
    apiKey: string;
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
    selfClient: {
      clientId: requireEnv('SELF_CLIENT_ID'),
      clientSecret: requireEnv('SELF_CLIENT_SECRET'),
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID ?? '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
      callbackUrl: process.env.DISCORD_CALLBACK_URL ?? '',
    },
    resend: {
      apiKey: process.env.RESEND_API_KEY ?? '',
      from: process.env.EMAIL_FROM ?? 'noreply@mpclub.dev',
    },
  };
}
