import { EntityRepository } from "@mikro-orm/core";
import { getRepositoryToken } from "@mikro-orm/nestjs";
import { Controller, Injectable } from "@nestjs/common";
import { TestingModule } from "@nestjs/testing";
import { MikroCrudControllerFactory, MikroCrudServiceFactory } from "src";
import supertest, { Response } from "supertest";
import { prepareE2E } from "../utils";
import { CreateBookDto, UpdateParentEntityDto } from "./dtos";
import { Book, Page } from "./entities";

describe("Basic CRUD", () => {
  let module: TestingModule;
  let requester: supertest.SuperTest<supertest.Test>;
  let response: Response;
  let createBookDto: CreateBookDto;
  let updateBookDto: UpdateParentEntityDto;
  let entity: Book;

  function assertEntityFieldTypes({ entity }: { entity: Book }) {
    expect(typeof entity.id).toBe("number");
    expect(typeof entity.name).toBe("string");
    expect(entity.price).toBeUndefined();
  }

  @Injectable()
  class TestService extends new MikroCrudServiceFactory({
    entityClass: Book,
    dtoClasses: {
      create: CreateBookDto,
      update: UpdateParentEntityDto,
    },
  }).product {}

  @Controller()
  class TestController extends new MikroCrudControllerFactory<TestService>({
    serviceClass: TestService,
    actions: ["list", "retrieve", "create", "replace", "update", "destroy"],
    lookup: { field: "id" },
  }).product {}

  beforeEach(async () => {
    ({ module, requester } = await prepareE2E(
      {
        controllers: [TestController],
        providers: [TestService],
      },
      [Book, Page]
    ));

    const bookRepository: EntityRepository<Book> = module.get(
      getRepositoryToken(Book)
    );
    for (let i = 1; i <= 5; i++) {
      const entity = new Book().assign({
        name: "parent" + i,
        price: i,
      });
      await bookRepository.persistAndFlush(entity);
    }
  });

  describe("/ (GET)", () => {
    describe("Common", () => {
      beforeEach(async () => {
        response = await requester.get("/");
      });

      it("should return status 200", () => {
        expect(response.status).toBe(200);
      });

      it("should show the total is 5", () => {
        expect(response.body.total).toBe(5);
      });

      it(`should return 5 transformed entities`, () => {
        expect(response.body.results).toHaveLength(5);
        response.body.results.forEach((entity: Book) =>
          assertEntityFieldTypes({ entity })
        );
      });
    });
  });

  describe("/ (POST)", () => {
    describe("Common", () => {
      beforeEach(async () => {
        createBookDto = { name: "new", price: 123 };
        response = await requester.post("/").send(createBookDto);
        entity = response.body;
      });

      it("should return status 201", () => {
        expect(response.status).toBe(201);
      });

      it("should return a transformed entity", () => {
        assertEntityFieldTypes({ entity });
        expect(entity.name).toBe(createBookDto.name);
      });
    });

    describe.each`
      data
      ${{}}
      ${{ name: 1 }}
    `("Illegal Data: $data", ({ data }) => {
      beforeEach(async () => {
        response = await requester.post("/").send(data);
      });

      it("should return status 400", () => {
        expect(response.status).toBe(400);
      });
    });
  });

  describe("/:lookup/ (GET)", () => {
    describe("Common", () => {
      beforeEach(async () => {
        response = await requester.get("/1/");
        entity = response.body;
      });

      it("should return status 200", () => {
        expect(response.status).toBe(200);
      });

      it("should return an serialized entity", () => {
        assertEntityFieldTypes({ entity });
        expect(entity.id).toBe(1);
      });
    });

    describe.each`
      lookup   | code
      ${0}     | ${404}
      ${"str"} | ${400}
    `("Illegal Lookup: $lookup", ({ lookup, code }) => {
      beforeEach(async () => {
        response = await requester.get(`/${lookup}/`);
      });

      it(`should return status ${code}`, () => {
        expect(response.status).toBe(code);
      });
    });
  });

  describe("/:lookup/ (PUT)", () => {
    beforeEach(() => {
      createBookDto = { name: "updated", price: 123 };
    });

    describe("Common", () => {
      beforeEach(async () => {
        response = await requester.put("/1/").send(createBookDto);
        entity = response.body;
      });

      it("should return status 200", () => {
        expect(response.status).toBe(200);
      });

      it("should return a transformed entity", () => {
        assertEntityFieldTypes({ entity });
        expect(entity.name).toBe(createBookDto.name);
      });
    });

    describe.each`
      data
      ${{}}
      ${{ name: "n" }}
    `("Illegal Data: $data", ({ data }) => {
      beforeEach(async () => {
        response = await requester.put("/1/").send(data);
      });

      it("should return status 400", () => {
        expect(response.status).toBe(400);
      });
    });

    describe.each`
      lookup   | code
      ${0}     | ${404}
      ${"put"} | ${400}
    `("Illegal Lookup: $lookup", ({ lookup, code }) => {
      beforeEach(async () => {
        response = await requester.put(`/${lookup}/`).send(createBookDto);
      });

      it(`should return status ${code}`, () => {
        expect(response.status).toBe(code);
      });
    });
  });

  describe("/:lookup/ (PATCH)", () => {
    beforeEach(() => {
      updateBookDto = { name: "updated" };
    });

    describe("Common", () => {
      beforeEach(async () => {
        response = await requester.patch("/1/").send(updateBookDto);
        entity = response.body;
      });

      it("should return status 200", () => {
        expect(response.status).toBe(200);
      });

      it("should return a transformed entity", () => {
        assertEntityFieldTypes({ entity });
        expect(entity.name).toBe(updateBookDto.name);
      });
    });

    describe.each`
      data
      ${{ name: 1 }}
    `("Illegal Data: $data", ({ data }) => {
      beforeEach(async () => {
        response = await requester.patch("/1/").send(data);
      });

      it("should return status 400", () => {
        expect(response.status).toBe(400);
      });
    });

    describe.each`
      lookup   | code
      ${0}     | ${404}
      ${"str"} | ${400}
    `("Illegal Lookup: $lookup", ({ lookup, code }) => {
      beforeEach(async () => {
        response = await requester.patch(`/${lookup}/`).send(updateBookDto);
      });

      it(`should return status ${code}`, () => {
        expect(response.status).toBe(code);
      });
    });
  });

  describe("/:lookup/ (DELETE)", () => {
    describe("Common", () => {
      beforeEach(async () => {
        response = await requester.delete("/1/");
      });

      it("should return status 204", () => {
        expect(response.status).toBe(204);
      });

      it("should return no content", () => {
        expect(response.body).toEqual({});
      });
    });

    describe.each`
      lookup   | code
      ${0}     | ${404}
      ${"str"} | ${400}
    `("Illegal Lookup: $lookup", ({ lookup, code }) => {
      beforeEach(async () => {
        response = await requester.delete(`/${lookup}/`);
      });

      it(`should return status ${code}`, () => {
        expect(response.status).toBe(code);
      });
    });
  });
});
