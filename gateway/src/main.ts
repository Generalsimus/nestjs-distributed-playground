import './telemetry';
import express from "express";
import { apiReference } from "@scalar/express-api-reference";
import fs from "fs";
import { createGrpcRouter } from "./createGrpcRouter";
import path from "path";
import { config } from './config';
import { UserService } from '../shared/proto/gen/ts/user/v1/user_pb';

const { PORT } = config;

async function bootstrap() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  app.get("/openapi.json", (_req, res) => res.json(JSON.parse(fs.readFileSync("./shared/proto/gen/openapi/api.swagger.json", "utf-8"))));
  app.use("/docs", apiReference({ url: "/openapi.json" }));

  const protoBinPath = path.join(process.cwd(), "./shared/proto/proto-descriptor.bin");

  const servicesAddresses = {
    [UserService.name]: "user-service:5001",
  };
  const router = createGrpcRouter(protoBinPath, servicesAddresses);

  app.use("/", router);

  app.listen(PORT, () => {
    console.log(`Gateway      →  http://localhost:${PORT}`);
    console.log(`Scalar Docs  →  http://localhost:${PORT}/docs`);
    console.log(`OpenAPI JSON →  http://localhost:${PORT}/openapi.json`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start gateway:", err);
  process.exit(1);
});
