import { Controller, Injectable } from "@nestjs/common";
import { MikroCrudControllerFactory, MikroCrudServiceFactory } from "src";
import supertest, { Response } from "supertest";
import { prepareE2E } from "../utils";
import { CreateBookDto, UpdateBookDto } from "./dtos";
import { Book } from "./entities";

describe("Disabled Actions", () => {
  let requester: supertest.SuperTest<supertest.Test>;
  let response: Response;

  @Injectable()
  class TestService extends new MikroCrudServiceFactory({
    entityClass: Book,
    dtoClasses: {
      create: CreateBookDto,
      update: UpdateBookDto,
    },
  }).product {}

  @Controller()
  class TestController extends new MikroCrudControllerFactory({
    serviceClass: TestService,
    actions: [],
    lookup: { field: "id" },
  }).product {}

  beforeEach(async () => {
    ({ requester } = await prepareE2E({
      controllers: [TestController],
      providers: [TestService],
    }));
  });

  describe("/ (GET)", () => {
    beforeEach(async () => {
      response = await requester.get("/");
    });

    it("should return status 404", () => {
      expect(response.status).toBe(404);
    });
  });
});
