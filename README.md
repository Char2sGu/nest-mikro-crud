# Nest RESTful

Graceful flexible builder for RESTful APIs with TypeORM.

# API Endpoints

| Action   | Method | URL                                  | Code        | Response |
| -------- | ------ | ------------------------------------ | ----------- | -------- |
| List     | GET    | /?limit=\<number\>&offset=\<number\> | 200,400     | Entity[] |
| Create   | POST   | /                                    | 201,400     | Entity   |
| Retrieve | GET    | /:lookup/                            | 200,404     | Entity   |
| Replace  | PUT    | /:lookup/                            | 200,400,404 | Entity   |
| Update   | PATCH  | /:lookup/                            | 200,400,404 | Entity   |
| Destroy  | DELETE | /:lookup/                            | 204,404     | void     |

# Quick Start

## Service

```ts
@Injectable()
class TestService extends new RestServiceFactory({
  entityClass: TestEntity,
  dtoClasses: { create: TestCreateDto, update: TestUpdateDto },
  lookupField: "id",
}).service {
  /**Force query conditions */
  async getQueryConditions(lookup?: number, user: User, action: string) {
    const conditions = await super.getQueryConditions(lookup, user);
    return {
      ...conditions,
      isActive: true,
    };
  }
}
```

## Controller

`ValidationPipe` is forced to be used in the controller.

```ts
@UseGuards(AuthGuard)
@Controller()
class TestController extends new RestControllerFactory({
  restServiceClass: TestService,
  routes: ["list", "create", "retrieve", "replace", "update", "destroy"],
  /**Custom args will be passed in every method of both the controller and the service */
  customArgs: {
    description: [
      // [<metadata-type>, <custom-param-decorators>]
      [User, [GetUser()]],
      [String, [Action()]],
    ],
    typeHelper: (user: User, action: string) => null,
  },
  /**Advanced settings of the query params */
  listQueryDto: new ListQueryDtoFactory({
    limit: { max: 100, default: 50 },
  }).product,
  /**Custom URL param, default `"lookup"` */
  lookupParam: "id",
  /**Whether to catch TypeORM's `EntityNotFoundError` and throw Nest's `NotFoundException` instead, default `true` */
  catchEntityNotFound: true,
})
  .applyDecorators("create", SkipAuth())
  .applyDecorators("destroy", AdminOnly()).controller {}
```
