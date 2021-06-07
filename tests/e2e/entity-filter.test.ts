import {
  BaseEntity,
  Entity,
  EntityRepository,
  Filter,
  PrimaryKey,
} from "@mikro-orm/core";
import { getRepositoryToken } from "@mikro-orm/nestjs";
import { Controller, Injectable } from "@nestjs/common";
import { TestingModule } from "@nestjs/testing";
import { MikroCrudControllerFactory, MikroCrudServiceFactory } from "src";
import supertest, { Response } from "supertest";
import { prepareE2E } from "tests/utils";
import { CreateBookDto, UpdateBookDto } from "./dtos";

@Filter({ name: "crud", cond: { id: 1 } })
@Entity()
export class Filtered extends BaseEntity<Filtered, "id"> {
  @PrimaryKey()
  id!: number;
}

describe("Entity Filter", () => {
  let module: TestingModule;
  let requester: supertest.SuperTest<supertest.Test>;
  let response: Response;

  @Injectable()
  class TestService extends new MikroCrudServiceFactory({
    entityClass: Filtered,
    dtoClasses: {
      create: CreateBookDto,
      update: UpdateBookDto,
    },
  }).product {}

  @Controller()
  class TestController extends new MikroCrudControllerFactory<TestService>({
    serviceClass: TestService,
    actions: ["list", "retrieve"],
    lookup: { field: "id" },
  }).product {}

  beforeEach(async () => {
    ({ module, requester } = await prepareE2E(
      {
        controllers: [TestController],
        providers: [TestService],
      },
      [Filtered]
    ));

    const repo: EntityRepository<Filtered> = module.get(
      getRepositoryToken(Filtered)
    );
    for (let i = 1; i <= 2; i++) {
      const entity = new Filtered().assign({ id: i });
      await repo.persistAndFlush(entity);
    }
  });

  describe("/ (GET)", () => {
    let response: Omit<Response, "body"> & { body: { total: number } };

    beforeEach(async () => {
      response = await requester.get("/");
    });

    it("should make the total 1", () => {
      expect(response.body.total).toBe(1);
    });
  });

  describe("/:lookup/ (GET)", () => {
    describe("Matching Filter", () => {
      beforeEach(async () => {
        response = await requester.get("/1/");
      });

      it("should return status 200", () => {
        expect(response.status).toBe(200);
      });
    });

    describe("Not Matching Filter", () => {
      beforeEach(async () => {
        response = await requester.get("/2/");
      });

      it("should return status 404", () => {
        expect(response.status).toBe(404);
      });
    });
  });
});
