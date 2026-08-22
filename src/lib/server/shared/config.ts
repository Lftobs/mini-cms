// Validate required environment variables on startup
const requiredEnvVars = [
  'JWT_SECRET_KEY',
  'JWT_REFRESH_SECRET',
  'GITHUB_ID',
  'GITHUB_SECRET',
  'BASE_URL'
] as const;

// Only validate in production or if explicitly requested to avoid breaking dev flow if .env is missing
if (import.meta.env.APP_ENV === 'prod') {
  requiredEnvVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      console.warn(`Warning: Missing environment variable: ${varName}`);
    }
  });
}

import { createPrivateKey } from "node:crypto";

<<<<<<< HEAD
function normalizePrivateKey(key: string | undefined): string | undefined {
    if (!key) return undefined;
    try {
        if (!key.includes("-----BEGIN RSA PRIVATE KEY-----")) return key;
        return createPrivateKey(key).export({ type: "pkcs8", format: "pem" }).toString();
    } catch (e) {
        console.warn("Invalid GitHub Private Key format");
        return undefined;
    }
=======
function normalizePrivateKey(key: string): string {
    if (!key.includes("-----BEGIN RSA PRIVATE KEY-----")) return key;
    return createPrivateKey(key).export({ type: "pkcs8", format: "pem" }).toString();
>>>>>>> origin/switch
}

export const config = {
  auth: {
    jwt: {
      secret: import.meta.env.JWT_SECRET_KEY!,
      refreshSecret: import.meta.env.JWT_REFRESH_SECRET!,
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
    },
    github: {
      clientId: import.meta.env.GITHUB_ID!,
      clientSecret: import.meta.env.GITHUB_SECRET!,
    },
    google: {
      clientId: import.meta.env.GOOGLE_ID!,
      clientSecret: import.meta.env.GOOGLE_SECRET!,
    },
    cookies: {
      accessToken: {
        name: 'access_token',
        httpOnly: true,
        secure: true,
        maxAge: 900, // 15 minutes
        path: '/',
      },
      refreshToken: {
        name: 'refresh_token',
        httpOnly: true,
        secure: true,
        maxAge: 604800, // 7 days
        path: '/',
      }
    }
  },
  email: {
    enabled: !!(import.meta.env.GMAIL_USER && import.meta.env.GMAIL_APP_PASSWORD),
    gmail: {
      user: import.meta.env.GMAIL_USER,
      password: import.meta.env.GMAIL_APP_PASSWORD,
    },
    from: {
      name: import.meta.env.EMAIL_FROM_NAME || 'Mini CMS',
    }
  },
  github: {
    app: {
      id: import.meta.env.GITHUB_APP_ID || import.meta.env.APP_ID!,
<<<<<<< HEAD
      privateKey: normalizePrivateKey(import.meta.env.GITHUB_PRIVATE_KEY || import.meta.env.PRIVATE_KEY),
=======
      privateKey: normalizePrivateKey(import.meta.env.GITHUB_PRIVATE_KEY || import.meta.env.PRIVATE_KEY!),
>>>>>>> origin/switch
    }
  },
  app: {
    baseUrl: import.meta.env.BASE_URL,
  }
} as const;

export type Config = typeof config;
