import helmet from "helmet";

export const secureHeaders = helmet({
  contentSecurityPolicy: false,

  crossOriginEmbedderPolicy: false,

  crossOriginResourcePolicy: false,

  hidePoweredBy: true,

  frameguard: { action: "deny" },

  strictTransportSecurity:
    process.env.NODE_ENV === "production"
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,

  noSniff: true,

  ieNoOpen: true,

  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});
