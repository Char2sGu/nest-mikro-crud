import { NestApplication } from "@nestjs/core";
import supertest from "supertest";

export function getRequester(app: NestApplication) {
  return supertest(app.getHttpServer());
}
