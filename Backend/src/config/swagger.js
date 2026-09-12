import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CINE-MARK API",
      version: "1.0.0",
      description: "Movie Watchlist Backend API",
    },
    servers: [
      {
        url: "http://localhost:8080",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },

  apis: ["./src/modules/**/*.routes.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
