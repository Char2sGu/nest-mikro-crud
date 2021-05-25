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
class OurController extends new RestControllerFactory<OurService /* <--- the generic type must be specified or type inference will went wrong */>(
  {
    // ...
    restServiceClass: OurService,
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
  }
).product {}
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

`.finalizeQueryConditions()` in the service is called before each query to process the conditions, it should return an array of conditions which represents `OR`.

```ts
class OurService /*extends ...*/ {
  async finalizeQueryConditions({
    conditions,
  }: {
    conditions: FindConditions<OurEntity>;
  }) {
    return [
      { ...conditions, isActive: true },
      { ...conditions, isActive: false, persist: true },
    ];
  }
}
```

**NOTE**: the type of the parem `lookup` may be either `number` or `string`, depending the `lookupField` you specified.

Here only static conditions can be forced, see [Context Data](#context-data) for more complex conditions.

## Context Data

Context Data provides a way to get anything you want through [custom decorators](https://docs.nestjs.com/custom-decorators).

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

Since the method of the service will pass rest parameters to any other methods it calls, the context data can always exist, so we can now force query conditions based on the request.

```ts
class OurService /*extends ...*/ {
  async finalizeQueryConditions({
    conditions,
    user,
  }: {
    conditions: FindConditions<OurEntity>;
    user: User;
  }) {
    return [
      { ...conditions, owner: user, isActive: true },
      { ...conditions, owner: user, isActive: false, persist: true },
    ];
  }
}
```

## Additional Decorators

To apply additional decorators, there is no need to override the method, specify all its params and types, and return its super method directly, all factories provides helper methods for your usage.

For example, to apply the auth guard for each action except _create_:

```ts
@Controller()
export class UsersController extends new RestControllerFactory({
  restServiceClass: UsersService,
  actions: ["list", "create", "retrieve", "replace", "update"],
  queryDto: new QueryDtoFactory<User>({
    limit: { max: 500, default: 100 },
  }).product,
  contextOptions: {
    user: { type: User, decorators: [ReqUser()] },
  },
})
  .applyMethodDecorators("list", UseGuards(JwtAuthGuard))
  .applyMethodDecorators("retrieve", UseGuards(JwtAuthGuard))
  .applyMethodDecorators("replace", UseGuards(JwtAuthGuard))
  .applyMethodDecorators("update", UseGuards(JwtAuthGuard)).product {}
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

For example, to custom the _list_ action's response:

```ts
class OurController /*extends ...*/ {
  @Patch(":lookup") // apply method decorators again
  async list(/* ... */) {
    const data = await super.list(/* ... */);
    return {
      ...data,
      youcan: "put anything here",
    };
  }
}
```

## Access Control

When the action is _list_ or _create_, the service's `.checkPermission()` will be called once with `{ action: "<the-action-name>" }` before performing the action.  
In other cases it will be called twice, once is with `{ action: "<the-action-name>" }` before loading the target entity and once is with `{ action: "<the-action-name>", entity: <the-target-entity> }` before performing the action.

Here is an example with [Context Data](#context-data):

```ts
async checkPermission({
  action,
  entity,
  user,
}: {
  action: ActionName;
  entity?: User;
  user?: User;
}) {
  if (!entity) {
    if (action == 'create' && user) throw new ForbiddenException();
  } else {
    if (entity.id != user.id) throw new ForbiddenException();
    if (action == 'replace' || action == 'update')
      if (!entity.isUpdatedRecently) throw new ForbiddenException();
  }
}
```

## Handling Relations

This lib implements only basic CRUD, but provides high flexibility for you to implement complex logic, such as things about entity relations, by overriding the methods with a clear division of labor.

For example, you'd like to create a membership for the user when creating a classroom:

```ts
class TestService /* extends ... */ {
  @InjectRepository(Membership)
  membershipRepository: Repository<Membership>;

  async create({ data, user }: { data: CreateClassroomDto; user: User }) {
    const membership = await this.membershipRepository.save({
      user,
      role: Role.HeadTeacher,
    });
    const classroom = await this.repository.save({
      ...data,
      members: [membership],
    });
    return classroom;
  }
}
```

Or you'd like to save nested entities using their primary keys:

```ts
class TestService /* extends ... */ {
  @InjectRepository(ChildEntity)
  childRepository!: Repository<ChildEntity>;

  async create({ data }: { data: CreateParentEntityDto }) {
    const childrenEntities = await Promise.all(
      data.children.map((id) => this.childRepository.findOne(id))
    );
    return await this.repository.save({
      ...data,
      children: childrenEntities,
    });
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
