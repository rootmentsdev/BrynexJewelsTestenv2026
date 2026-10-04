import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Rootfin API",
            version: "1.0.0",
            description: "API documentation for the Rootfin.",
        },
        servers: [
            {
                url: "https://rootfin-testenv-ebb5.onrender.com",
                description: "Live Development Server",
            },
        ],
    },
    apis: ["./route/*.js"], 
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

export default setupSwagger; 
