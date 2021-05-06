# Nest RESTful

Graceful flexible builder for RESTful APIs with TypeORM.

# Features

- Super easy and fast to build RESTful APIs
- Extremly strongly typed
- Well-designed code structure for high flexibility and extensibility
- Helper methods allow to apply extra decorators easily
- Nesting support

# Tutorial

## Creating the Service

The service is a provider providing database CRUD operations. It can be created easily by extending the `RestServiceFactory`'s product.

```ts
@Injectable()
class OurService extends new RestServiceFactory({
  entityClass: OurEntity,
  dtoClasses: {
    create: CreateOurEntityDto,
    update: UpdateOurEntityDto,
  },
  lookupField: "id",
}).product {}
```

- `entityClass` specifies the entity of the api endpoint, the repository will be auto-injected to `.repository` using the default connection, unless you specified `repoConnection` as another connection name
- `dtoClasses` is only used for generic type inferation in the service, **NOTE** that `replace` actions use the `create` DTO.
- `lookupField` is the key of the field who will be used to lookup the entity, generally it is specified to `"id"` or other fields with a unique constraint

The options passed to the factory will be defined as metadata of the service using the symbol key `REST_SERVICE_OPTIONS_METADATA_KEY`, the key can be imported from the package directly.

## Creating the Controller

There is also a `RestControllerFactory` for you to create controllers.

```ts
@Controller()
class OurController extends new RestControllerFactory({
  restServiceClass: OurService,
  routes: ["list", "create", "retrieve", "replace", "update", "destroy"],
}).product {}
```

Here it is the simplest controller, this controller provides the following API endpoints.

| Action   | Method | URL                                  | Code        | Response |
| -------- | ------ | ------------------------------------ | ----------- | -------- |
| List     | GET    | /?limit=\<number\>&offset=\<number\> | 200,400     | Entity[] |
| Create   | POST   | /                                    | 201,400     | Entity   |
| Retrieve | GET    | /:lookup/                            | 200,404     | Entity   |
| Replace  | PUT    | /:lookup/                            | 200,400,404 | Entity   |
| Update   | PATCH  | /:lookup/                            | 200,400,404 | Entity   |
| Destroy  | DELETE | /:lookup/                            | 204,404     | void     |

Also, the service will be auto-injected, so there is nothing more to do inside the class in simplest cases.

- Data validation is forced to be enabled using the `ValidationPipe`, based on the DTOs specified in the service, you can custom the pipe's behavior by passing your own options to the `validationPipeOptions` option, but **NOTE** that a few options will be ignored.
- `ParseIntPipe` is used to parse the lookup param to a number when the type of the `lookupField` specified in the service is `number`.
- We have a filter `EntityNotFoundErrorFilter` to catch TypeORM's `EntityNotFoundError` and throw Nest's `NotFoundException` instead, you could disable this behavior by specifing the option `catchEntityNotFound` in the controller factory.
- By default, the url param of the lookup value is just `"lookup"`, you can custom it by passing your own param name to the `lookupParam` option if needed.

## Advanced Query Params Settings

There is a query DTO used to validate the query params of all the routes, the default query DTO have unlimited `limit` and `offset`, there is also a `QueryDtoFactory` provided for you to custom the DTO.

You could also pass your own DTO or extend the factory for more wonderful implementations.

```ts
class OurController extends new RestControllerFactory({
  // ...
  queryDto: new QueryDtoFactory({
    limit: { max: 100, default: 50 },
    offset: { max: 10000 },
  }).product,
  // ...
}).product {}
```

## Forcing Query Conditions

The method `.getQueryConditions()` in the service is useful in this case, and moreover, almost all the methods in this lib is asynchronous, so you could implement anything awesome by overriding the methods.

```ts
class OurService /*extends ...*/ {
  async getQueryConditions(lookup: number) {
    const conditions = await super.getQueryConditions(lookup);
    return { ...conditions, isActive: true };
  }
}
```

**NOTE**: the type of the parem `lookup` may be either `number` or `string`, depending the `lookupField` you specified. For forcing more complex query conditions, see [Getting More Context Data](#getting-more-context-data)

## Getting More Context Data

By default, only a few context data is passed to the service method, so what we can implement is greatly limited. So the option `customArgs` is here to help. Custom arguments are the arguments passed in each method of both the service and the controller as rest arguments.This option exists in both the service factory and the controller factory, having different uses.

In the service factory, it is only a type helper function for generic type inferation of the rest arguments.

```ts
class OurService extends new RestServiceFactory({
  // ...
  customArgs: (user: User, method: string) => null,
  // ...
}).product {}
```

In the controller factory, it is a list of param type and param decorators tuples. The param type will be defined as the param's type in its metadata, the param decorators will be applied to the param.

```ts
class OurController extends new RestControllerFactory({
  // ...
  customArgs: [
    [User, [RequestUser()]],
    [String, [Method()]],
  ],
  // ...
}).product {}
```

**NOTE**: The `RequestUser()` and `Method()` here are [custom decorators](https://docs.nestjs.com/custom-decorators), `RequestUser()` gets the user from the request and `Method()` gets the request's method.

With custom arguments, we could force more complex query conditions easily.

```ts
class OurService /*extends ...*/ {
  async getQueryConditions(lookup: number, user: User, method: string) {
    const conditions = await super.getQueryConditions();
    return { ...conditions, owner: user, isActive: true };
  }
}
```

## Applying Additional Decorators

You may want to apply some additional decorators to implement wonderful things, there is no need to create an empty overload and specify all parameters and types for it, the factory has easy-to-use methods to do that.

Skip authentication control for `create` actions:

```ts
@UseGurads(AuthGuard)
class OurController extends new RestControllerFactory({
  // ...
}).applyMethodDecorators("create", SkipAuth()).product {}
```

Apply decorators for the 1st param of `.retrieve()`

```ts
class OurController extends new RestControllerFactory({
  // ...
}).applyParamDecorators("retrieve", 0 /*, <decorators>*/).product {}
```

Apply a list of decorators for each param of `.update()`

```ts
class OurController extends new RestControllerFactory({
  // ...
}).applyParamDecoratorSets(
  "retrieve",
  [
    /*<decorators for the 1st param>*/
  ],
  [
    /*<decorators for the 2nd param>*/
  ]
).product {}
```

## Customizing the Data Structure of List Action

The service's `.finalizeList()` method is called every time before sending the response, after transforming the entities. By default, it takes the transformed entities and the queries and return the entities directly. Change this behavior by overriding it:

```ts
class OurService /*extends ...*/ {
  async finalizeList(entities: OurEntity[], queries: QueryDto<OurEntity>) {
    return {
      total: await this.repository.count(),
      results: entities,
    };
  }
}
```

## Transforming Entities before Responding

The method `.transform()` in the service may help you. By default, it takes an entity, call [class-transformer](https://github.com/typestack/class-transformer)'s `plainToClass()` and then return it, that means you could use class-transformer's `Exclude()` decorator to prevent some fields to appear in the response.

```ts
class OurEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Exclude()
  password: string;
}
```

You could also change its behavior and do anything with the entity by overriding it.

```ts
class OurService /*extends ...*/ {
  async transform(entity: OurEntity) {
    return entity; // disable transforming
  }
}
```

## Nested Relation Fields

The query param `expand` specifies which paths will be expanded as a nested field, and the others will be outputted as a primary key. Don't worry about type safe of the paths, the paths have been strongly typed.

```ts
class OurController extends new RestControllerFactory({
  // ...
  queryDto: new QueryDtoFactory<OurEntity>({
    // ...
    expand: { in: ["child", "nested.child"] },
    // ...
  }).product,
  // ...
}).product {}
```

You can custom the relation options by overriding the `getRelationOptions` of the service.

```ts
class OurService /*extends ...*/ {
  async getRelationOptions(queries: QueryDto) {
    return { loadRelationIds: true }; // disable nesting
  }
}
```

## Overriding Routing Methods

Here is something you should know before overriding the route methods, or something confusing may happen to you.

- Nest's controller decorators store metadata in constructors, and when getting metadata, it will look up the value in the prototype chain, so there is no need to decorate the class again when extending another class.
- Nest's route method decorators store metadata in route methods directly, when looking metadata, it will look up the value directly from the method, but if we override a method, the method will be a different one, so all the metadata will be lost, we need to apply route method decorators again.
- Nest's param decorators store metadata in the constructors, as said before, there is no need to apply param decorators again.

So here is the example:

```ts
class OurController /*extends ...*/ {
  @Patch(":lookup")
  async update(lookup: number, dto: UpdateOurEntityDto) {
    // ...
  }
}
```

## Reusability

To reuse your wonderful overridings, the best solution is to extend the built-in factory and perform your overriding in the factory's protected `.createRawClass()` method, you can look for more details in the source code.

**DONT** use mixins because the base class may be changed to a different one so the metadata defined in the factory will be lost.
