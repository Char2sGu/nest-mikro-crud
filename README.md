# Nest RESTful

Easily build RESTful CRUD APIs

**NOTE**: v0.x are unstable versions, which means there may be breaking changes even though only the minor version grows. See the commit history for detailed changes.

# Features

- Super easy and fast to build RESTful CRUD APIs
- Fully strongly typed
- High flexibility and extensibility

# Tutorial

Everything in this lib is created using factories which will create a class on its `.product` property when instantiated based on the options passed to the constructor, so that we can not only custom the product's behavior but also implement strong generic types.

## Creating the Service

The service is a [provider](https://docs.nestjs.com/providers) serving the controller.

```ts
@Injectable()
class OurService extends new RestServiceFactory({
  entityClass: OurEntity,
  repoConnection: "main-db", // optional
  dtoClasses: {
    create: CreateOurEntityDto,
    update: UpdateOurEntityDto,
  },
  lookupField: "id",
}).product {}
```

Here a service is created. It will be injected the TypeORM repository of the entity `OurEntity` using connection name `"main-db"`, and its CRUD methods will use `"id"` as the field to lookup, `CreateOurEntityDto` as the DTO type for the _create_ and _replace_ action and `UpdateOurEntityDto` as the DTO type for the _update_ action.

The options passed to the factory will be slightly processed, and be defined as metadata on the service using the `symbol` key `REST_SERVICE_OPTIONS_METADATA_KEY`.

## Creating the Controller

There is also a `RestControllerFactory` to create the controller.

```ts
@Controller()
class OurController extends new RestControllerFactory({
  restServiceClass: OurService,
  actions: ["list", "create", "retrieve", "replace", "update", "destroy"],
  lookupParam: "userId", // optional
}).product {}
```

Here it is the simplest controller with all the API endpoints enabled.

| Action   | Method | URL       | Code        | Response                             |
| -------- | ------ | --------- | ----------- | ------------------------------------ |
| List     | GET    | /         | 200,400     | { total: number; results: Entity[] } |
| Create   | POST   | /         | 201,400     | Entity                               |
| Retrieve | GET    | /:lookup/ | 200,404     | Entity                               |
| Replace  | PUT    | /:lookup/ | 200,400,404 | Entity                               |
| Update   | PATCH  | /:lookup/ | 200,400,404 | Entity                               |
| Destroy  | DELETE | /:lookup/ | 204,404     | void                                 |

- `OurService` will be injected automatically, so there is nothing more to do inside the class in simplest cases.
- The DTO classes specified during the service's creation will be used for validation using the `ValidationPipe`. The options to pass to the `ValidationPipe` can be customed by specifying the option `validationPipeOptions`, but the `transform` and `transformOptions.exposeDefaultValues` will be forced to be `true`.
- `"userId"` will be the name of the URL param. By default it is `"lookup"`
- `ParseIntPipe` will be applied to parse the lookup param if the type of the field to lookup specified during the service's creation is `number`.
- An [exception filter](https://docs.nestjs.com/exception-filters) `EntityNotFoundErrorFilter` is applied by default to catch TypeORM's `EntityNotFoundError` and throw Nest's `NotFoundException` instead, which can be disabled by specifing the option `catchEntityNotFound` to `false`.

In this controller, only `limit` and `offset` query param is enabled for the _list_ action, to config more query params see [Configuring Query Params](#configuring-query-params)

## Configuring Query Params

There is a query DTO class used to validate the query params of all the actions, the default query DTO only have unlimited `limit` and `offset`, there is also a `QueryDtoFactory` provided to custom the DTO class.

```ts
class OurController extends new RestControllerFactory({
  // ...
  queryDto: new QueryDtoFactory<OurEntity>({
    limit: { max: 100, default: 50 },
    offset: { max: 10000 },
    expand: {
      in: ["relationField", "relationField.nestedField"],
      default: ["relationField"],
    },
    order: {
      in: ["id", "name", "ascOnlyField:asc"],
      default: ["id:desc"],
    },
    filter: {
      in: ["id", "name"],
    },
  }).product,
  // ...
}).product {}
```

Alternatively, you can pass your own DTO class matching the interface.

```ts
class OwnQueryDto implements QueryDto<OurEntity> {
  @IsOptional()
  @Min(100)
  limit: number = 500;
  // ...
}

class OurController extends new RestControllerFactory({
  // ...
  queryDto: OwnQueryDto,
  // ...
}).product {}
```

| Filter Query          | Find Operator               |
| --------------------- | --------------------------- |
| name\|contains:QCX    | `Like("%QCX%")`             |
| name\|endsWith:X      | `Like("%X")`                |
| name\|eq:QCX          | `Equal("QCX")`              |
| age\|gt:16            | `MoreThan(16)`              |
| age\|gte:16           | `MoreThanOrEqual(16)`       |
| name\|icontains:QCX   | `ILike("%QCX%")`            |
| name\|iendswith:X     | `ILike("%X")`               |
| name\|in:Q,C,X,\\,\\, | `In(["Q", "C", "X", ",,"])` |
| name\|isnull:true     | `IsNull()`                  |
| name\|isnull:false    | `Not(IsNull())`             |
| name\|istartswith:Q   | `ILike("Q%")`               |
| age\|lt:60            | `LessThan(60)`              |
| age\|lte:60           | `LessThanOrEqual(60)`       |
| name\|ne:QCX          | `Not("QCX")`                |
| name\|startswith:Q    | `Like("Q%")`                |

## Forcing Query Conditions

`.getQueryConditions()` in the service is called to get primary query conditions for each actions.

```ts
class OurService /*extends ...*/ {
  async getQueryConditions({ lookup }: { lookup?: number }) {
    const conditions = await super.getQueryConditions({ lookup });
    return { ...conditions, isActive: true };
  }
}
```

**NOTE**: the type of the parem `lookup` may be either `number` or `string`, depending the `lookupField` you specified.

Here only static conditions can be forced, see [Context Data](#context-data) for more complex conditions.

## Context Data

Context Data provides a way to get any context data through [custom decorators](https://docs.nestjs.com/custom-decorators).

```ts
class OurController extends new RestControllerFactory({
  // ...
  contextOptions: {
    user: { type: User, decorators: [ReqUser()] },
  },
  // ...
}).product {}
```

This means that the `ReqUser()` decorator will be applied to the first rest argument of each controller's method to get the user from the request, and `User` will be the metadata type of this argument (optional, `Object` by default). Then the values of the extra arguments will be packed into an object and pass to the service's methods, in this case it will be `{ user: <value-of-the-argument> }`

Because the service's methods will pass rest arguments to each other methods, we can now force query conditions based on the request.

```ts
class OurService /*extends ...*/ {
  async getQueryConditions({ lookup, user }: { lookup?: number; user: User }) {
    const conditions = await super.getQueryConditions({ lookup });
    return { ...conditions, owner: user, isActive: true };
  }
}
```

## Additional Decorators

You may would like to apply some additional decorators to implement something wonderful, there is no need to create an empty overload and specify all parameters and types, the factory has easy-to-use methods for that.

Skip authentication control for `create` actions:

```ts
@UseGurads(AuthGuard)
class OurController extends new RestControllerFactory({
  // ...
}).applyMethodDecorators("create", SkipAuth()).product {}
```

Apply decorators for the 4th param of `.retrieve()`

```ts
class OurController extends new RestControllerFactory({
  // ...
}).applyParamDecorators("retrieve", 4, Session()).product {}
```

Apply a list of decorators for each param of `.update()`

```ts
class OurController extends new RestControllerFactory({
  // ...
}).applyParamDecoratorSets(
  "update",
  [
    /*<decorators for the 1st param>*/
  ],
  [
    /*<decorators for the 2nd param>*/
  ]
).product {}
```

## Finalizing Response of List Action

The service's `.finalizeList()` method is called before sending the response to finalize the response (after [transforming the entities](#transforming-entities-before-responding)). By default, it takes the transformed entities and return a simple schema like this `{ total: 1342, results: [{ id: 1 }] }`. Change this behavior by overriding it:

```ts
class OurService /*extends ...*/ {
  async finalizeList({ entities }: { entities: OurEntity[] }) {
    return entities; // return an array of entities directly
  }
}
```

## Transforming Entities before Responding

The service's `.transform()` is called on each entity before sending the response. By default, it takes an entity, call [class-transformer](https://github.com/typestack/class-transformer)'s `plainToClass()` and then return it, which means fields can be excluded from the response using the `Exclude()` decorator.

```ts
@Entity()
class OurEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Exclude()
  password: string;
}
```

Overriding it to do anything with the entity.

```ts
class OurService /*extends ...*/ {
  async transform({ entity }: { entity: OurEntity }) {
    return entity; // disable transforming
  }
}
```

## Overriding Controller's Action Methods

Here is something you should know before overriding the action methods, otherwise something really confusing may happen to you.

- Nest's controller decorators store metadata in the constructor, and when getting metadata, it will look up the metadata value through the prototype chain, so there is no need to decorate the class again when extending another class.
- Nest's action method decorators store metadata in action methods directly, when looking metadata, it will look up the value directly from the method, but if we override a method, the method will be different from the old one and all the metadata will be lost, method decorators should be applied again.
- Nest's param decorators store metadata in the constructor, as said before, there is no need to apply param decorators again.

Here is an example:

```ts
class OurController /*extends ...*/ {
  @Patch(":lookup") // apply method decorators again
  async update(lookup: number, data: UpdateOurEntityDto) {
    // ...
  }
}
```

## Reusability

It is recommended to create your own factory to reuse wonderful overridings by performing the overriding in the factory's protected `.createRawClass()` method.

```ts
class OwnServiceFactory<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupableField<Entity> = LookupableField<Entity>
> extends RestServiceFactory<Entity, CreateDto, UpdateDto, LookupField> {
  protected createRawClass() {
    return class RestService extends super.createRawClass() {
      async finalizeList({ entities }: { entities: Entity[] }) {
        return entities;
      }
    };
  }
}
```

**DONT** use mixins because metadata may be lost.
