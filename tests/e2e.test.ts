import { Controller, Injectable, Provider, Type } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  EntityField,
  QueryDtoFactory,
  RestControllerFactory,
  RestServiceFactory,
} from "src";
import { Response } from "supertest";
import { getConnection, Repository } from "typeorm";
import {
  CreateChildEntityDto,
  CreateParentEntityDto,
  UpdateParentEntityDto,
} from "./dtos";
import { ChildEntity, ParentEntity } from "./entities";
import { getRequester, getTypeOrmModules } from "./utils";

function assertEntity(
  entity: ParentEntity,
  id?: number,
  expand: EntityField<ParentEntity>[] = []
) {
  expect(typeof entity.id).toBe("number");
  if (id) expect(entity.id).toBe(id);
  expect(entity.name).toBeUndefined();
  entity.children.forEach((child) => {
    if (expand.includes("children")) expect(child).toBeInstanceOf(Object);
    else expect(typeof child).toBe("number");
  });
}

describe("E2E", () => {
  let parentRepository: Repository<ParentEntity>;
  let childRepository: Repository<ChildEntity>;
  let requester: ReturnType<typeof getRequester>;
  let response: Response;
  let createChildDto: CreateChildEntityDto;
  let createParentDto: CreateParentEntityDto;
  let updateParentDto: UpdateParentEntityDto;

  async function prepare(serviceClass: Provider, controllerClass: Type) {
    const module = await Test.createTestingModule({
      imports: [...getTypeOrmModules(ParentEntity, ChildEntity)],
      controllers: [controllerClass],
      providers: [serviceClass],
    }).compile();

    const app = await module.createNestApplication().init();

    parentRepository = module.get(getRepositoryToken(ParentEntity));
    childRepository = module.get(getRepositoryToken(ChildEntity));
    requester = getRequester(app);

    for (let i = 1; i <= 3; i++)
      await parentRepository.save({
        name: "parent",
        children: [{ name: "child1" }],
      });
  }

  afterEach(async () => {
    await getConnection().close();
  });

  describe("Common CRUD", () => {
    @Injectable()
    class TestService extends new RestServiceFactory({
      entityClass: ParentEntity,
      dtoClasses: {
        create: CreateParentEntityDto,
        update: UpdateParentEntityDto,
      },
      lookupField: "id",
    }).product {}

    @Controller()
    class TestController extends new RestControllerFactory<TestService>({
      restServiceClass: TestService,
      actions: ["list", "retrieve", "create", "replace", "update", "destroy"],
      queryDto: new QueryDtoFactory<ParentEntity>({
        limit: { max: 2, default: 1 },
        expand: { in: ["children"] },
        order: { in: ["id:desc"] },
        filter: { in: ["id"] },
      }).product,
    }).product {}

    beforeEach(async () => {
      await prepare(TestService, TestController);
    });

    describe.each`
      limit        | offset       | expand                      | order          | filter                    | count | total | firstId
      ${undefined} | ${undefined} | ${undefined}                | ${undefined}   | ${undefined}              | ${1}  | ${3}  | ${1}
      ${2}         | ${undefined} | ${undefined}                | ${undefined}   | ${undefined}              | ${2}  | ${3}  | ${1}
      ${undefined} | ${1}         | ${undefined}                | ${undefined}   | ${undefined}              | ${1}  | ${3}  | ${2}
      ${2}         | ${1}         | ${undefined}                | ${undefined}   | ${undefined}              | ${2}  | ${3}  | ${2}
      ${undefined} | ${undefined} | ${undefined}                | ${["id:desc"]} | ${undefined}              | ${1}  | ${3}  | ${3}
      ${undefined} | ${undefined} | ${["children"]}             | ${undefined}   | ${undefined}              | ${1}  | ${3}  | ${1}
      ${undefined} | ${undefined} | ${["children", "children"]} | ${undefined}   | ${undefined}              | ${1}  | ${3}  | ${1}
      ${undefined} | ${undefined} | ${undefined}                | ${undefined}   | ${["id|eq:2"]}            | ${1}  | ${1}  | ${2}
      ${2}         | ${undefined} | ${undefined}                | ${undefined}   | ${["id|in:2,3"]}          | ${2}  | ${2}  | ${2}
      ${2}         | ${undefined} | ${undefined}                | ${undefined}   | ${["id|eq:2", "id|eq:1"]} | ${1}  | ${1}  | ${1}
    `(
      "/?limit=$limit&offset=$offset&expand[]=$expand&order[]=$order&filter[]=$filter (GET)",
      ({ limit, offset, expand, order, filter, count, total, firstId }) => {
        let body: { total: number; results: ParentEntity[] };

        beforeEach(async () => {
          response = await requester.get("/").query({
            limit,
            offset,
            "expand[]": expand,
            "order[]": order,
            "filter[]": filter,
          });
          ({ body } = response);
        });

        it("should return 200", () => {
          expect(response.status).toBe(200);
        });

        it(`should serialize and return the response with ${count} entities`, () => {
          expect(body.total).toBeDefined();
          expect(body.total).toBe(total);
          expect(body.results).toBeInstanceOf(Array);
          expect(body.results).toHaveLength(count);
          assertEntity(body.results[0], firstId, expand ?? []);
        });
      }
    );

    describe.each`
      limit        | offset       | expand       | order           | filter
      ${0}         | ${undefined} | ${undefined} | ${undefined}    | ${undefined}
      ${undefined} | ${0}         | ${undefined} | ${undefined}    | ${undefined}
      ${4}         | ${undefined} | ${undefined} | ${undefined}    | ${undefined}
      ${undefined} | ${undefined} | ${"child2"}  | ${undefined}    | ${undefined}
      ${undefined} | ${undefined} | ${["xxxx"]}  | ${undefined}    | ${undefined}
      ${undefined} | ${undefined} | ${undefined} | ${"id:desc"}    | ${undefined}
      ${undefined} | ${undefined} | ${undefined} | ${["idd:desc"]} | ${undefined}
      ${undefined} | ${undefined} | ${undefined} | ${["id:descc"]} | ${undefined}
      ${undefined} | ${undefined} | ${undefined} | ${undefined}    | ${"id|eq:1"}
      ${undefined} | ${undefined} | ${undefined} | ${undefined}    | ${["children|eq:1"]}
    `(
      "/?limit=$limit&offset=$offset&expand[]=$expand&order[]=$order&filter[]=$filter (GET)",
      ({ limit, offset, expand, order, filter }) => {
        beforeEach(async () => {
          response = await requester.get("/").query({
            limit,
            offset,
            [expand instanceof Array ? "expand[]" : "expand"]: expand,
            [order instanceof Array ? "order[]" : "order"]: order,
            [filter instanceof Array ? "filter[]" : "filter"]: filter,
          });
        });

        it("should return a 400", () => {
          expect(response.status).toBe(400);
        });
      }
    );

    describe("/ (POST)", () => {
      beforeEach(async () => {
        createChildDto = { name: "child" };
        createParentDto = { name: "parent", children: [4] };
        await childRepository.save(createChildDto);
        response = await requester.post("/").send(createParentDto);
      });

      it("should return 201", () => {
        expect(response.status).toBe(201);
      });

      it("should create the entity", async () => {
        const entity = await parentRepository.findOne(4);
        expect(entity).toBeDefined();
        expect(entity?.name).toBe(createParentDto.name);
      });

      it("should serialize and return entity", () => {
        assertEntity(response.body, 4);
      });
    });

    describe.each`
      dto
      ${{}}
      ${{ name: 1 }}
    `("/ $dto (POST)", ({ dto }) => {
      beforeEach(async () => {
        response = await requester.post("/").send(dto);
      });

      it("should return 400", () => {
        expect(response.status).toBe(400);
      });
    });

    describe("/1/ (GET)", () => {
      beforeEach(async () => {
        response = await requester.get("/1/");
      });

      it("should return 200", () => {
        expect(response.status).toBe(200);
      });

      it("should serialize and return the entity", () => {
        assertEntity(response.body, 1);
      });
    });

    describe.each`
      lookup   | code
      ${0}     | ${404}
      ${"str"} | ${400}
    `("/$lookup/ (GET)", ({ lookup, code }) => {
      beforeEach(async () => {
        response = await requester.get(`/${lookup}/`);
      });

      it(`should return ${code}`, () => {
        expect(response.status).toBe(code);
      });
    });

    describe("/1/ (PUT)", () => {
      beforeEach(async () => {
        createParentDto = { id: 999, name: "updated", children: [1] };
        response = await requester.put("/1/").send(createParentDto);
      });

      it("should return 200", () => {
        expect(response.status).toBe(200);
      });

      it("should serialize and return the entity", () => {
        assertEntity(response.body, 999);
      });
    });

    describe.each`
      dto
      ${{}}
      ${{ name: "n" }}
    `("/1/ $dto (PUT)", ({ dto }) => {
      beforeEach(async () => {
        response = await requester.put("/1/").send(dto);
      });

      it("should return 400", () => {
        expect(response.status).toBe(400);
      });
    });

    describe.each`
      lookup   | code
      ${0}     | ${404}
      ${"put"} | ${400}
    `("/$lookup/ (PUT)", ({ lookup, code }) => {
      beforeEach(async () => {
        createParentDto = { name: "updated", children: [1] };
        response = await requester.put(`/${lookup}/`).send(createParentDto);
      });

      it(`should return ${code}`, () => {
        expect(response.status).toBe(code);
      });
    });

    describe("/1/ (PATCH)", () => {
      beforeEach(async () => {
        updateParentDto = { id: 999, name: "updated" };
        response = await requester.patch("/1/").send(updateParentDto);
      });

      it("should return 200", () => {
        expect(response.status).toBe(200);
      });

      it("should serialize and return the entity", () => {
        assertEntity(response.body, 999);
      });
    });

    describe.each`
      dto
      ${{ name: 1 }}
    `("/1/ $dto (PATCH)", ({ dto }) => {
      beforeEach(async () => {
        response = await requester.patch("/1/").send(dto);
      });

      it("should return 400", () => {
        expect(response.status).toBe(400);
      });
    });

    describe.each`
      lookup   | code
      ${0}     | ${404}
      ${"str"} | ${400}
    `("/$lookup/ (PATCH)", ({ lookup, code }) => {
      beforeEach(async () => {
        updateParentDto = { name: "updated" };
        response = await requester.patch(`/${lookup}/`).send(updateParentDto);
      });

      it(`should return ${code}`, () => {
        expect(response.status).toBe(code);
      });
    });

    describe("/1/ (DELETE)", () => {
      beforeEach(async () => {
        response = await requester.delete("/1/");
      });

      it("should return 204", () => {
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
    `("/$lookup/ (DELETE)", ({ lookup, code }) => {
      beforeEach(async () => {
        response = await requester.delete(`/${lookup}/`);
      });

      it(`should return ${code}`, () => {
        expect(response.status).toBe(code);
      });
    });
  });
});
