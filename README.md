# Nest.js + MikroORM CRUD

##### Easily build RESTful CRUD APIs for production.

# Features

- [**Super strong template literal types and generic types**](#creating-the-controller)
- Common query parameters implemented (limit, offset, order, filter)
- Methods are designed to be extensible and composable
- Production security problems considered
- Code well tested

# Default API Endpoints

| Action   | Method | URL       | Code        | Response                             |
| -------- | ------ | --------- | ----------- | ------------------------------------ |
| List     | GET    | /         | 200,400     | { total: number; results: Entity[] } |
| Create   | POST   | /         | 201,400     | Entity                               |
| Retrieve | GET    | /:lookup/ | 200,404     | Entity                               |
| Replace  | PUT    | /:lookup/ | 200,400,404 | Entity                               |
| Update   | PATCH  | /:lookup/ | 200,400,404 | Entity                               |
| Destroy  | DELETE | /:lookup/ | 204,404     | void                                 |

Of course, the response bodies are customizable by [overriding the controller's routing methods](#overriding-routing-methods).

# Quick Start

## Creating the Service

The methods of the service are designed to be highly composable and universal to allow you to use it in various places, not just limited to integration with the controller.

```ts
@Injectable()
export class BooksService extends new MikroCrudServiceFactory({
  entityClass: Book,
  dtoClasses: {
    create: CreateBookDto,
    update: UpdateBookDto,
  },
}).product {}
```

- `Collection` fields will always be populated
- Primary keys are ensured to be in the JSON response instead of actual data by marking all the relation fields as unpopulated.
- _Replace_ actions use the same DTO class as _Create_ actions.

You find that few options are passed to the factory, right? Actually, these options passed to the factory are only the parts necessary to create the class. Most of the configurable things are implemented by overriding its composable methods.

## Creating the Controller

---

There are some wonderful types which are able to get **literal types** of **all** the nested circular relation fields' paths and scalar fields' paths like `"owner.books.author"`, you can feel it in the `queryDtoClass.order` and `queryDtoClass.filter` options.

---

```ts
@Controller("api/books")
export class BooksController extends new MikroCrudControllerFactory<BooksService>(
  {
    serviceClass: BooksService,
    /**
     * Specify which actions will be enabled.
     */
    actions: ["list", "retrieve", "create", "replace", "update", "destroy"],
    /**
     * `type` should be one of "number", "string" and "uuid" and will be inferred from the metadata
     * type if not specified: Number -> "number", String -> "uuid".
     *
     * `name` is the param name in the url, useful when overriding routing methods, default `"lookup"`.
     */
    lookup: { field: "id", type: "number", name: "id" },

    // options below are optional

    /**
     * Configure the query params.
     *
     * You could also pass your own class or extend the product.
     */
    queryDtoClass: new QueryDtoFactory<Book>({
      // min value is always 0
      limit: { max: 200, default: 100 },
      // min value is always 0
      offset: { max: 100000 },
      order: {
        // can be either a path or a path + order.
        // literal types completely supported
        in: ["name", "price", "writer.name:asc"],
        default: ["price:desc"],
      },
      filter: {
        // allowed fields
        // literal types completely supported
        in: ["name", "price", "writer.name"],
        default: ["price|gte:50", "price|lte:100"],
      },
    }).product,
    /**
     * `type`: the metadata type of the user parameter in routing methods, default `Object`.
     * `decorators`: custom decorators to pick the user from the request.
     * By default, `ReqUser()` is applied to pick the user from `request.user`.
     */
    requestUser: { type: User, decorators: [RequestUser()] },
    /**
     * Customize the options to pass to the validation pipe
     * `transform` and `transformOptions.exposeDefaultValues` will be forced to be `true`
     */
    validationPipeOptions: {},
  }
).product {}
```

**NOTE**: _order_ and _filter_ param should always be arrays in the url like `/?order[]=&filter[]=`

#### Available Filter Operators:

| Operator | Full Name             |
| -------- | --------------------- |
| eq       | Equal                 |
| gt       | Greater Than          |
| gte      | Greater Than or Equal |
| in       | In                    |
| lt       | Less Than             |
| lte      | Less Than or Equal    |
| ne       | Not Equal             |
| nin      | Not In                |
| like     | Like                  |
| ilike    | Insensitive Like      |
| isnull   | Is Null               |
| notnull  | Not Null              |

## Exclude Fields from the Response

See MikroORM's [docs](https://mikro-orm.io/docs/serializing/#hidden-properties)

```ts
@Entity()
class MyEntity {
  @PrimaryKey()
  id: number;

  @Property({ hidden: true }) // exclude
  price: number;
}
```

## Mandatory Filtering

By default, the MikroORM's entity filters with name `"crud"` will be enabled.

**NOTE**: `user` parameter is picked from `request.user` by default, and may be `undefined`. You can custom where to pick the user in the controller's `requestUser` [option](#creating-the-controller).

```ts
@Filter({
  name: "crud",
  cond: ({ user }: { user: User }) => ({ owner: user }),
})
@Entity()
class Book extends BaseEntity<Book, "id"> {
  @PrimaryKey()
  id: number;

  @ManyToOne(() => User)
  owner: User;
}
```

You could enable any filters by overriding the service's `.decideEntityFilters()` method.

## Access Controlling

The service's `.checkPermission()` is usually called two times during a request, one is before performing any database operations, the other is before performing the operation on the entity. Therefore, in the first call, the parameter `entity` will be undefined, but not in the second call.

By default, it is an empty method which returns directly.

**NOTE**: In _List_ and _Create_ actions it will be called only once.

```ts
class UsersService /* extends... */ {
  async checkPermission({
    action,
    entity: targetUser,
    user,
  }: {
    action: ActionName;
    entity?: User;
    user?: User;
  }) {
    if (targetUser) {
      if (action == "update") {
        // forbid the user to update anyone except himself
        if (targetUser.id != user.id) throw new ForbiddenException();
        // forbid to update if updated recently
        if (targetUser.isUpdatedRecently) throw new ForbiddenException();
      }
    }
  }
}
```

## Additional Operations in Database CRUD

There are seven CRUD methods in the service: `.list()`, `.create()`, `.retrieve()`, `.replace()`, `.update()`, `.destroy()` and `.save()`. As mentioned before, the methods in the service are **composable**, so each CRUD method is only responsible for its own CRUD operation. In the controller, each routing method will call **multiple** CRUD methods. `.save()` will be always called at the end of every routing methods to flush the repository.

**NOTE**: `repository.flush()` will flush changes of all the entities, not only the repository entity.

So when you would like to create multiple related entities when creating an entity, you could override `.create()`.  
Correspondingly, you could override `.update()` if you want to update related entities when updating an entity.

**NOTE**: `.replace()` has the same code with `.update()` by default, while _Replace_ actions will call `.replace()` and _Update_ actions will call `.update()`.

## Applying Additional Decorators

All the factories provide methods to apply decorators.

```ts
export class UsersController extends new MikroCrudControllerFactory({
  // ...
  queryDtoClass: new QuerDtoFactory({
    // ...
  })
    .applyPropertyDecorators("limit", Min(100))
    .applyPropertyDecorators("offset", Min(100)).product,
  // ...
})
  .applyMethodDecorators("list", UseGuards(JwtAuthGuard))
  .applyMethodDecorators("create", UseGuards(JwtAuthGuard)).product {}
```

## Overriding Routing Methods

In Nest.js, decorators have different behavior when decorating different things.

| Decorating  | Metadata Stored To | Lookup Metadata From |
| ----------- | ------------------ | -------------------- |
| a class     | the class          | the prototype chain  |
| a method    | the method         | the method           |
| a parameter | the class          | the prototype chain  |

So we see if a routing method is overridden, it will lose all its metadata and should be applied the decorators again.

For example, to override the _Update_ action's routing method:

```ts
class UsersController /*extends ...*/ {
  // The url parameter name is based on what you have specified in the controller factory options
  @Patch(":userId") // decorators should be applied again
  // params do not need decorators
  async update(lookup: number, data: UpdateUserDto, user: User) {
    // ...
  }
}
```
