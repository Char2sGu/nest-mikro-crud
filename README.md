# Nest RESTful

Graceful flexible builder for RESTful APIs with TypeORM.

# API Endpoints

| Action   | Method | URL                              | Code        |
| -------- | ------ | -------------------------------- | ----------- |
| List     | GET    | /?limit=<number>&offset=<number> | 200         |
| Create   | POST   | /                                | 201,400     |
| Retrieve | GET    | /:lookup/                        | 200,404     |
| Replace  | PUT    | /:lookup/                        | 200,400,404 |
| Update   | PATCH  | /:lookup/                        | 200,400,404 |
| Destroy  | DELETE | /:lookup/                        | 204,404     |

# Quick Start

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

```ts
@UseGuards(AuthGuard)
@UsePipes(ValidationPipe)
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
  /**Custom URL param, default `"lookup"` */
  lookupParam: "id",
  /**Whether to catch TypeORM's `EntityNotFoundError` and throw Nest's `NotFoundException` instead, default `true` */
  catchEntityNotFound: true,
})
  .applyDecorators("create", SkipAuth())
  .applyDecorators("destroy", AdminOnly()).controller {}
```
