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
  UpdateChildEntityDto,
  UpdateParentEntityDto,
} from "./dtos";
import { Child1Entity, Child2Entity, ParentEntity } from "./entities";
import { getRequester, getTypeOrmModules } from "./utils";

function assertEntity(
  entity: ParentEntity,
  id?: number,
  expand: EntityField<ParentEntity>[] = []
) {
  expect(typeof entity.id).toBe("number");
  if (id) expect(entity.id).toBe(id);
  expect(entity.name).toBeUndefined();
  if (expand.includes("child1")) expect(entity.child1).toBeInstanceOf(Object);
  else expect(typeof entity.child1).toBe("number");
  if (expand.includes("child2")) expect(entity.child2).toBeInstanceOf(Object);
  else expect(typeof entity.child2).toBe("number");
}

describe("E2E", () => {
  let parentRepository: Repository<ParentEntity>;
  let child1Repository: Repository<Child1Entity>;
  let child2Repository: Repository<Child1Entity>;
  let requester: ReturnType<typeof getRequester>;
  let response: Response;
  let createChildDto: CreateChildEntityDto;
  let updateChildDto: UpdateChildEntityDto;
  let createParentDto: CreateParentEntityDto;

  async function prepare(serviceClass: Provider, controllerClass: Type) {
    const module = await Test.createTestingModule({
      imports: [...getTypeOrmModules(ParentEntity, Child1Entity, Child2Entity)],
      controllers: [controllerClass],
      providers: [serviceClass],
    }).compile();

    const app = await module.createNestApplication().init();

    parentRepository = module.get(getRepositoryToken(ParentEntity));
    child1Repository = module.get(getRepositoryToken(Child1Entity));
    child2Repository = module.get(getRepositoryToken(Child2Entity));
    requester = getRequester(app);

    for (let i = 1; i <= 3; i++)
      await parentRepository.save({
        name: "parent",
        child1: { name: "child1" },
        child2: { name: "child2" },
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
    class TestController extends new RestControllerFactory({
      restServiceClass: TestService,
      actions: ["list", "retrieve", "create", "replace", "update", "destroy"],
      queryDto: new QueryDtoFactory<ParentEntity>({
        limit: { max: 2, default: 1 },
        expand: { in: ["child1", "child2"] },
        order: { in: ["id:desc"] },
      }).product,
    }).product {}

    beforeEach(async () => {
      await prepare(TestService, TestController);
    });

    describe.each`
      limit        | offset       | expand                  | order          | count | firstId
      ${undefined} | ${undefined} | ${undefined}            | ${undefined}   | ${1}  | ${1}
      ${2}         | ${undefined} | ${undefined}            | ${undefined}   | ${2}  | ${1}
      ${undefined} | ${1}         | ${undefined}            | ${undefined}   | ${1}  | ${2}
      ${2}         | ${1}         | ${undefined}            | ${undefined}   | ${2}  | ${2}
      ${undefined} | ${undefined} | ${undefined}            | ${["id:desc"]} | ${1}  | ${3}
      ${undefined} | ${undefined} | ${["child1"]}           | ${undefined}   | ${1}  | ${1}
      ${undefined} | ${undefined} | ${["child1", "child2"]} | ${undefined}   | ${1}  | ${1}
      ${undefined} | ${undefined} | ${["child1", "child1"]} | ${undefined}   | ${1}  | ${1}
    `(
      "/?limit=$limit&offset=$offset&expand[]=$expand&order[]=$order (GET)",
      ({ limit, offset, expand, order, count, firstId }) => {
        let body: { total: number; results: ParentEntity[] };

        beforeEach(async () => {
          response = await requester
            .get("/")
            .query({ limit, offset, "expand[]": expand, "order[]": order });
          ({ body } = response);
        });

        it("should return 200", () => {
          expect(response.status).toBe(200);
        });

        it(`should serialize and return the response with ${count} entities`, () => {
          expect(body.total).toBeDefined();
          expect(body.total).toBe(3);
          expect(body.results).toBeInstanceOf(Array);
          expect(body.results).toHaveLength(count);
          assertEntity(body.results[0], firstId, expand ?? []);
        });
      }
    );

    describe.each`
      limit        | offset       | expand       | order
      ${0}         | ${undefined} | ${undefined} | ${undefined}
      ${undefined} | ${0}         | ${undefined} | ${undefined}
      ${4}         | ${undefined} | ${undefined} | ${undefined}
      ${undefined} | ${undefined} | ${"child2"}  | ${undefined}
      ${undefined} | ${undefined} | ${["xxxx"]}  | ${undefined}
      ${undefined} | ${undefined} | ${undefined} | ${"id:desc"}
      ${undefined} | ${undefined} | ${undefined} | ${["idd:desc"]}
      ${undefined} | ${undefined} | ${undefined} | ${["id:descc"]}
    `(
      "/?limit=$limit&offset=$offset&expand[]=$expand&order[]=$order (GET)",
      ({ limit, offset, expand, order }) => {
        beforeEach(async () => {
          response = await requester.get("/").query({
            limit,
            offset,
            [expand instanceof Array ? "expand[]" : "expand"]: expand,
            [order instanceof Array ? "order[]" : "order"]: order,
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
        createParentDto = { name: "parent", child1: 4, child2: 4 };
        await child1Repository.save(createChildDto);
        await child2Repository.save(createChildDto);
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
        createParentDto = { name: "updated", child1: 1, child2: 1 };
        response = await requester.put("/1/").send(createParentDto);
      });

      it("should return 200", () => {
        expect(response.status).toBe(200);
      });

      it("should update the entity", async () => {
        const entity = await parentRepository.findOne(1);
        expect(entity?.name).toBe(createParentDto.name);
      });

      it("should serialize and return the entity", () => {
        assertEntity(response.body, 1);
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
        createParentDto = { name: "updated", child1: 1, child2: 1 };
        response = await requester.put(`/${lookup}/`).send(createParentDto);
      });

      it(`should return ${code}`, () => {
        expect(response.status).toBe(code);
      });
    });

    describe("/1/ (PATCH)", () => {
      beforeEach(async () => {
        updateChildDto = { name: "updated" };
        response = await requester.patch("/1/").send(updateChildDto);
      });

      it("should return 200", () => {
        expect(response.status).toBe(200);
      });

      it("should update the entity", async () => {
        const entity = await parentRepository.findOne(1);
        expect(entity?.name).toBe(updateChildDto.name);
      });

      it("should serialize and return the entity", () => {
        assertEntity(response.body, 1);
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
        updateChildDto = { name: "updated" };
        response = await requester.patch(`/${lookup}/`).send(updateChildDto);
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
