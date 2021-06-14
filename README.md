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

**NOTE**: _Replace_ actions use the same DTO class as _Create_ actions.

You find that few options are passed to the factory, right? Actually, these options passed to the factory are only the parts necessary to create the class. Most of the configurable things are implemented by overriding its composable methods.

## Creating the Controller

---

There are some wonderful types which are able to get **literal types** of **all** the nested circular relation fields' paths and scalar fields' paths like `"owner.books.author"`. Enjoy them in the `queryDtoClass.order`, `queryDtoClass.filter` and `queryDtoClass.expand` options.

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
      expand: {
        // allowed fields
        // literal types completely supported
        in: ["writer", "writer.profile"],
        default: ["writer"],
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

## Excluding Fields from the Response

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

By default, the MikroORM's entity filters with name `"crud"` will be enabled. The `user` parameter is picked from `request.user` by default, which is customizable through the [`requestUser` option](<[option](#creating-the-controller)>).

**NOTE**: `user` may be `undefined` if no auth guards are used.

```ts
@Filter({
  name: "crud",
  cond: ({ user }: { user: User }) => ({
    owner: user,
    writer: { age: { $gte: 18 } }, // MikroORM will join the required relations automatically
  }),
})
@Entity()
class Book extends BaseEntity<Book, "id"> {
  @PrimaryKey()
  id: number;

  @ManyToOne(() => User)
  owner: User;
}
```

You could dicide which filters to enable and what parameters to pass to the filters by overriding the service's `.decideEntityFilters()` method.

```ts
class BooksService /* extends ... */ {
  async decideEntityFilters({ user }: { user: User }) {
    return { filterName: { these_are: "parameters" } };
  }
}
```

## Populating Relations

By default, `Collection` fields of the entity will be populated mandatorily. The user can populate relations by passing the `expand` query param like `book.owner.profile`, and you could specify which fields is allowed to be expanded by specifying the `expand.in` option when creating the query DTO.

**You could populate any relations when handling the request and don't need to worry there will be extra relations expanded unexpectedly in the response. All the entities will be processed before responding to ensure only the relations mentioned in the `expand` query param are marked as _populated_ to shape the response, therefore, although `Collection` fields are populated mandatorily, they will be only an array of primary keys in the response if they are not mentioned in the `expand` query param.**

## Additional Operations During Database CRUD

There are seven CRUD methods in the service: `.list()`, `.create()`, `.retrieve()`, `.replace()`, `.update()`, `.destroy()` and `.save()`. As mentioned before, the methods in the service are **composable**, so each CRUD method is only responsible for its own CRUD operation. **Multiple** CRUD methods will be called in a routing method.

`.save()` will be always called once at the end of each routing method to flush the repository. In _Create_, _Replace_, _Update_ actions, it will be called one more time right after the entity is created/updated.

**NOTE**: `repository.flush()` will flush changes of **all the managed entities**, which means `booksRepo.flush()` will also flush changes of `User` entities.

`.replace()` has the same code as `.update()` by default, while _Replace_ actions will call `.replace()` and _Update_ actions will call `.update()`.

```ts
class BooksService /* extends... */ {
  @Inject()
  authorsService: AuthorsService;

  async create({
    data,
    user,
  }: {
    data: CreateBookDto | EntityData<Book>;
    user: User;
  }) {
    const book = await super.create({ data: { ...data, owner: user } });
    const author = await this.authorsService.create({
      data: { user, book },
      user,
    });
    return book;
  }

  async destroy({ entity: book, user }: { entity: Book; user: User }) {
    if (user.username != "admin") throw new ForbiddenException();
    return await super.destroy({ entity: book, user });
  }
}
```

## Applying Additional Decorators

All the factories provide a variety of utility methods, including applying different decorators.

```ts
export class UsersController extends new MikroCrudControllerFactory<UsersService>(
  {
    // ...
    queryDtoClass: new QuerDtoFactory<User>({
      // ...
    })
      .applyPropertyDecorators("limit", Min(100))
      .applyPropertyDecorators("offset", Min(100)).product,
    // ...
  }
)
  .applyMethodDecorators("list", UseGuards(JwtAuthGuard))
  .applyMethodDecorators("create", UseGuards(JwtAuthGuard)).product {}
```

## Overriding Routing Methods

In Nest.js, decorators have different behaviors when decorating different things.

| Decorating  | Metadata Stored To | Lookup Metadata From |
| ----------- | ------------------ | -------------------- |
| a class     | the class          | the prototype chain  |
| a method    | the method         | the method           |
| a parameter | the class          | the prototype chain  |

So we see if a routing method is overridden, it will lose all its metadata.

```ts
class UsersController /*extends ...*/ {
  // The url parameter name should be what you have specified
  // in the `lookup.name` option.
  @Patch(":userId") // method decorators should be applied again
  // params do not need to apply decorators
  async update(lookup: number, data: UpdateUserDto, user: User) {
    // ...
  }
}
```
