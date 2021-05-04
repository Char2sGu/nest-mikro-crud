# Nest RESTful

Graceful flexible builder for RESTful APIs with TypeORM.

# Features

- Super fast to build RESTful APIs
- Strongly typed
- Super flexible, methods can be easily overriden for wonderful implements
- Extremely simple to apply additional decorators
- Metadata fully defined
- Asynchronous everywhere
- Validation Included

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
- `dtoClasses` is only used for generic type inferation in the service
- `lookupField` is the key of the field who will be used to lookup the entity, generally it is specified to `"id"` or other fields with a unique constraint

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

Also, the service will be auto-injected, so there is nothing more to do inside the class.

Here is something you may want to know if you are going to implement complex things: In the controllers created by the factory, data validation is forced to be enabled using the `ValidationPipe`, based on the DTOs specified in the service. `ParseIntPipe` is used to parse the lookup param to a number when the type of the `lookupField` specified in the service is `number`. We have a filter `EntityNotFoundErrorFilter` to catch TypeORM's `EntityNotFoundError` and throw Nest's `NotFoundException` instead, you could disable this behavior by specifing the option `catchEntityNotFound` in the controller factory.

## Advanced Limit and Offset Settings

The default list query DTO does not restrict anything, you could pass your own query DTO to the controller's `listQueryDto` option, we also provide `ListQueryDtoFactory` for you to build simple list query DTOs.

```ts
class OurController extends new RestControllerFactory({
  // ...
  listQueryDto: new ListQueryDtoFactory({
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
    /*<decorators for the 2st param>*/
  ]
).product {}
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

## Output Relation Fields

Nested output has not supported yet...

Currently, all the relations will be output as primary keys.

```
{
  "id": 1,
  "relationField": 1
}
```
