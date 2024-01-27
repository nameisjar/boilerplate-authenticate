require("dotenv").config();
const { PORT } = process.env.PORT || 3000;
const express = require("express");
const cors = require("cors");
const app = express();
const router = require("./routes");
const {
    notFoundHandler,
    internalErrorHandler,
    prismaErrorHandler,
    zodErrorHandler,
} = require("./middlewares/error");
const swaggerUi = require("swagger-ui-express");
const swaggerDocs = require("./docs/swagger.json");

const allowedOrigins = [
    "http://localhost:5000",
];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Origin Not allowed by CORS"));
            }
        },
    }),
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", true);
//Routes
app.use("/api", router);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// Middlewares errors
app.use(zodErrorHandler);
app.use(prismaErrorHandler);
app.use(notFoundHandler);
app.use(internalErrorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})

module.exports = app