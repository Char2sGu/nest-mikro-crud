import { EntityRepository } from "@mikro-orm/core";
import { getRepositoryToken } from "@mikro-orm/nestjs";
import { Controller, Injectable, Type } from "@nestjs/common";
import { TestingModule } from "@nestjs/testing";
import {
  MikroCrudControllerFactory,
  MikroCrudServiceFactory,
  QueryDtoFactory,
} from "src";
import { MikroCrudModule } from "src/mikro-crud.module";
import supertest, { Response } from "supertest";
import { prepareE2E } from "tests/utils";
import { CreateBookDto, UpdateBookDto } from "./dtos";
import { Book, Line, Page } from "./entities";

describe("Query Params", () => {
  let module: TestingModule;
  let requester: supertest.SuperTest<supertest.Test>;
  let response: Response;
  let entity: Book;

  async function prepare(controllerClass: Type) {
    ({ module, requester } = await prepareE2E({
      imports: [MikroCrudModule],
      controllers: [controllerClass],
      providers: [TestService],
    }));

    const [bookRepo, pageRepo, lineRepo] = [
      module.get<EntityRepository<Book>>(getRepositoryToken(Book)),
      module.get<EntityRepository<Page>>(getRepositoryToken(Page)),
      module.get<EntityRepository<Line>>(getRepositoryToken(Line)),
    ];
    for (let i = 1; i <= 5; i++) {
      const book = bookRepo.create({
        name: "parent" + i,
        price: i,
        summary: { text: "summary" + i },
      });
      bookRepo.persist(book);

      const page = pageRepo.create({
        book,
        number: i,
      });
      pageRepo.persist(page);

      const line = lineRepo.create({
        page,
        text: "text" + i,
      });
      lineRepo.persist(line);
    }

    await bookRepo.flush();
  }

  @Injectable()
  class TestService extends new MikroCrudServiceFactory({
    entityClass: Book,
    dtoClasses: {
      create: CreateBookDto,
      update: UpdateBookDto,
    },
  }).product {}

  describe("Limit & Offset", () => {
    @Controller()
    class TestController extends new MikroCrudControllerFactory<TestService>({
      serviceClass: TestService,
      actions: ["list"],
      lookup: { field: "id" },
      queryDtoClass: new QueryDtoFactory<Book>({
        limit: { max: 3, default: 1 },
        offset: { max: 2, default: 1 },
      }).product,
    }).product {}

    beforeEach(async () => {
      await prepare(TestController);
    });

    describe("/ (GET)", () => {
      describe.each`
        queries          | count | firstId
        ${{}}            | ${1}  | ${2}
        ${{ limit: 2 }}  | ${2}  | ${2}
        ${{ offset: 2 }} | ${1}  | ${3}
      `("Common Queries: $queries", ({ queries, count, firstId }) => {
        beforeEach(async () => {
          response = await requester.get("/").query(queries);
        });

        it(`should make the results have length ${count} `, () => {
          expect(response.body.results).toHaveLength(count);
        });

        it(`should make the first id ${firstId}`, () => {
          entity = response.body.results[0];
          expect(entity.id).toBe(firstId);
        });
      });

      describe.each`
        queries
        ${{ limit: 0 }}
        ${{ limit: -1 }}
        ${{ limit: 4 }}
        ${{ offset: 0 }}
        ${{ offset: -1 }}
        ${{ offset: 3 }}
      `("Illegal Queries: $queries", ({ queries }) => {
        beforeEach(async () => {
          response = await requester.get("/").query(queries);
        });

        it(`should return status 400`, () => {
          expect(response.status).toBe(400);
        });
      });
    });
  });

  describe("Order", () => {
    @Controller()
    class TestController extends new MikroCrudControllerFactory<TestService>({
      serviceClass: TestService,
      actions: ["list"],
      lookup: { field: "id" },
      queryDtoClass: new QueryDtoFactory<Book>({
        order: {
          in: ["id:desc", "name:desc", "summary.text"],
          default: ["id:desc"],
        },
      }).product,
    }).product {}

    beforeEach(async () => {
      await prepare(TestController);
    });

    describe("/ (GET)", () => {
      describe.each`
        order                    | firstId
        ${undefined}             | ${5}
        ${["id:desc"]}           | ${5}
        ${["name:desc"]}         | ${5}
        ${["summary.text:desc"]} | ${5}
      `("Legal Order: $order", ({ order, firstId }) => {
        beforeEach(async () => {
          response = await requester.get("/").query({ "order[]": order });
          entity = response.body.results[0];
        });

        it(`should make the first id ${firstId}`, () => {
          expect(entity.id).toBe(firstId);
        });
      });

      describe.each`
        queries
        ${{ order: ["id:desc"] }}
        ${{ "order[]": ["id:xxxx"] }}
      `("Illegal Order: $queries", ({ queries }) => {
        beforeEach(async () => {
          response = await requester.get("/").query(queries);
        });

        it("should returns status 400", () => {
          expect(response.status).toBe(400);
        });
      });
    });
  });

  describe("Filter", () => {
    @Controller()
    class TestController extends new MikroCrudControllerFactory<TestService>({
      serviceClass: TestService,
      actions: ["list"],
      lookup: { field: "id" },
      queryDtoClass: new QueryDtoFactory<Book>({
        filter: {
          in: ["id", "name", "summary.text"],
          default: ["name|eq:parent3"],
        },
      }).product,
    }).product {}

    beforeEach(async () => {
      await prepare(TestController);
    });

    describe("/ (GET)", () => {
      describe.each`
        filter                          | count | firstId
        ${undefined}                    | ${1}  | ${3}
        ${["id|eq:"]}                   | ${0}  | ${undefined}
        ${["id|eq:2"]}                  | ${1}  | ${2}
        ${["id|gt:2"]}                  | ${3}  | ${3}
        ${["name|gt:parent2"]}          | ${3}  | ${3}
        ${["id|gte:2"]}                 | ${4}  | ${2}
        ${["name|gte:parent2"]}         | ${4}  | ${2}
        ${["name|in:"]}                 | ${0}  | ${undefined}
        ${["name|in:parent2,parent3"]}  | ${2}  | ${2}
        ${["id|lt:3"]}                  | ${2}  | ${1}
        ${["name|lt:parent3"]}          | ${2}  | ${1}
        ${["id|lte:3"]}                 | ${3}  | ${1}
        ${["name|lte:parent3"]}         | ${3}  | ${1}
        ${["id|ne:"]}                   | ${5}  | ${1}
        ${["id|ne:1"]}                  | ${4}  | ${2}
        ${["id|nin:1,2"]}               | ${3}  | ${3}
        ${["name|like:parent%"]}        | ${5}  | ${1}
        ${["name|like:%rent5"]}         | ${1}  | ${5}
        ${["name|like:%rent5"]}         | ${1}  | ${5}
        ${["name|isnull:"]}             | ${0}  | ${undefined}
        ${["name|notnull:"]}            | ${5}  | ${1}
        ${["id|gt:1", "id|lt:3"]}       | ${1}  | ${2}
        ${["summary.text|eq:summary1"]} | ${1}  | ${1}
      `("Legal Filter: $filter", ({ filter, count, firstId }) => {
        beforeEach(async () => {
          response = await requester.get("/").query({ "filter[]": filter });
        });

        it(`should make the results have length ${count}`, () => {
          expect(response.body.results).toHaveLength(count);
        });

        it(`should make the first id ${firstId}`, () => {
          entity = response.body.results[0];
          expect(entity?.id).toBe(firstId);
        });
      });
    });
  });

  describe("Expand", () => {
    @Controller()
    class TestController extends new MikroCrudControllerFactory<TestService>({
      serviceClass: TestService,
      actions: ["retrieve"],
      lookup: { field: "id" },
      queryDtoClass: new QueryDtoFactory<Book>({
        expand: {
          in: ["pages.lines.page"],
        },
      }).product,
    }).product {}

    beforeEach(async () => {
      await prepare(TestController);
    });

    describe("/:id/ (GET)", () => {
      describe("Legal Expand", () => {
        beforeEach(async () => {
          response = await requester
            .get("/1/")
            .query({ "expand[]": ["pages.lines.page"] });
        });

        it("should expand the specified relation fields", () => {
          const entity: Book = response.body;
          expect(entity.pages[0].lines[0].page.id).toBeDefined();
        });
      });

      describe.each`
        queries
        ${{ expand: "pages.lines.page" }}
        ${{ "expand[]": "" }}
        ${{ "expand[]": "unknown" }}
        ${{ "expand[]": "pages" }}
        ${{ "expand[]": "pages.lines" }}
      `("Illegal Expand: $queries", ({ queries }) => {
        beforeEach(async () => {
          response = await requester.get("/1/").query(queries);
        });

        it("should return status 400", () => {
          expect(response.status).toBe(400);
        });
      });
    });
  });
});
