import { INestApplication } from "@nestjs/common";
import supertest from "supertest";

export function getRequester(app: INestApplication) {
  return supertest(app.getHttpServer());
}
