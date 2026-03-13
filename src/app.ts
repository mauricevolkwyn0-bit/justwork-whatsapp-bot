import express from "express";
import { loggerMiddleware } from "./middleware/logger.middleware";
import routes from "./routes";

const app = express();

app.use(express.json());
app.use(loggerMiddleware);
app.use("/api", routes);

export default app;