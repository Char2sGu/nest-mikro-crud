# Nest RESTful

Easily build RESTful CRUD APIs

**NOTE**: v0.x are unstable versions, which means there may be breaking changes even though only the minor version grows. See the commit history for detailed changes.

# Features

- Super easy and fast to build RESTful CRUD APIs
- Fully strongly typed
- High flexibility and extensibility

# Tutorial

Everything in this lib is created using factories which will create a class on its `.product` property when instantiated based on the options passed to the constructor, so that we can not only custom the product's behavior but also implement strong generic types.

## Basic RESTful Resource

```ts
@Injectable()
class UsersService extends new RestServiceFactory({
  entityClass: User,
  repoConnection: "auth-db", // default: undefined
  dtoClasses: {
    create: CreateUserDto,
    update: UpdateUserDto,
  },
  lookupField: "id",
}).product {}
```

```ts
@Controller()
class UsersController extends new RestControllerFactory<UsersService>({
  restServiceClass: UsersService,
  actions: ["list", "create", "retrieve", "replace", "update", "destroy"],
  lookupParam: "userId", // default: "lookup"
  queryDtoClass: new QueryDtoFactory<User>({
    limit: { default: 50, max: 200 },
    offset: { max: 10000 },
    order: {
      in: ["id", "name", "age"],
      default: ["id:desc"],
      mandatory: ["name:asc", "age:asc"],
    },
    expand: { in: ["department", "department.manager"] },
    filter: { in: ["id", "name", "age"], mandatory: ["age|gte:18"] },
  }).product,
}).product {}
```

| Action   | Method | URL       | Code        | Response                             |
| -------- | ------ | --------- | ----------- | ------------------------------------ |
| List     | GET    | /         | 200,400     | { total: number; results: Entity[] } |
| Create   | POST   | /         | 201,400     | Entity                               |
| Retrieve | GET    | /:userId/ | 200,404     | Entity                               |
| Replace  | PUT    | /:userId/ | 200,400,404 | Entity                               |
| Update   | PATCH  | /:userId/ | 200,400,404 | Entity                               |
| Destroy  | DELETE | /:userId/ | 204,404     | void                                 |

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

## Forcing Advanced Query Conditions

You can force conditions by pass the mandatory value of `filter` param when creating the query DTO, but it is in the controller level, which means the conditions will not work when calling the service's method outside the controller, and is not possible to force complex conditions.

```ts
class UsersService /*extends ...*/ {
  async finalizeQueryConditions({
    conditions,
  }: {
    conditions: FindConditions<User>;
  }) {
    return [
      { ...conditions, isActive: true },
      { ...conditions, isActive: false, persist: true },
    ];
  }
}
```

To force conditions based on the request user, see [Context Data](#context-data).

## Context Data

Context Data provides a way to get anything you want through [custom decorators](https://docs.nestjs.com/custom-decorators).

```ts
class UsersController extends new RestControllerFactory({
  // ...
  contextOptions: {
    user: { type: User, decorators: [ReqUser()] },
  },
  // ...
}).product {}
```

`ReqUser()` here is a custom decorator which is able to get the user from the request. This means that `user` will be always available in each method of the service.

```ts
class UsersService /*extends ...*/ {
  async finalizeQueryConditions({
    conditions,
    user,
  }: {
    conditions: FindConditions<User>;
    user: User;
  }) {
    return [
      { ...conditions, boss: user, isActive: true },
      { ...conditions, boss: user, isActive: false, persist: true },
    ];
  }
}
```

## Additional Decorators

For example, to apply the auth guard for each action except _create_:

```ts
@Controller()
export class UsersController extends new RestControllerFactory({
  // ...
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
class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Exclude()
  password: string;
}
```

Overriding it to custom transform options or do anything you want.

```ts
class UsersService /*extends ...*/ {
  async transform({ entity }: { entity: User }) {
    return plainToClass(User, entity, {
      // ...
    });
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
class UsersController /*extends ...*/ {
  @Patch(":userId") // method decorators should be applied again
  async list(/* ... */) {
    const data = await super.list(/* ... */);
    return {
      ...data,
      you_could: "put anything here",
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
    // forbid authed users to create users
    if (action == 'create' && user) throw new ForbiddenException();
  } else {
    // forbid the user to update anyone except himself
    if (entity.id != user.id) throw new ForbiddenException();
    // forbid the user to update if updated recently
    if (action == 'replace' || action == 'update')
      if (!entity.isUpdatedRecently) throw new ForbiddenException();
  }
}
```

## Handling Relations

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
      // write your own code here
    };
  }
}
```

**DONT** use mixins because metadata may be lost.
