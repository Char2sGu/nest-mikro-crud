# Nest RESTful

Easily build RESTful CRUD APIs

**NOTE**: This package has been renamed to `nest-mikro-orm` which replaced TypeORM with MikroORM.

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
}).product {}
```

```ts
@Controller()
class UsersController extends new RestControllerFactory<UsersService>({
  restServiceClass: UsersService,
  actions: ["list", "create", "retrieve", "replace", "update", "destroy"],
  lookup: { field: "id" },
  queryDtoClass: new QueryDtoFactory<User>({
    limit: { default: 50, max: 200 },
    offset: { max: 10000 },
    order: {
      in: ["id", "name", "age"],
      default: ["id:desc"],
    },
    expand: { in: ["department", "department.manager"] },
    filter: { in: ["id", "name", "age"] },
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
| name\|eq:QCX          | `Equal("QCX")`              |
| age\|gt:16            | `MoreThan(16)`              |
| age\|gte:16           | `MoreThanOrEqual(16)`       |
| name\|in:Q,C,X,\\,\\, | `In(["Q", "C", "X", ",,"])` |
| age\|lt:60            | `LessThan(60)`              |
| age\|lte:60           | `LessThanOrEqual(60)`       |
| name\|ne:QCX          | `Not("QCX")`                |
| name\|nin:Q,C,X       | `Not(In(["Q", "C", "X"]))`  |
| name\|like:%C%        | `Like("%C%")`               |
| name\|ilike:%C%       | `ILike("%C%")`              |
| name\|isnull:         | `IsNull()`                  |
| name\|notnull:        | `Not(IsNull())`             |

## Forcing Query Conditions

```ts
class UsersService /*extends ...*/ {
  async finalizeQueryConditions({
    conditions,
    user,
  }: {
    conditions: FindConditions<User>;
    user: User;
  }) {
    return conditions.map((conditions) => ({
      ...conditions,
      isActive: true,
      owner: user,
    }));
  }
}
```

## Forcing Orders

```ts
class UsersService /* extends ... */ {
  async parseOrders(args: any) {
    return { ...(await super.parseOrders(args)), age: "ASC" };
  }
}
```

## Custom Request User

By default, the request user will be picked from `request.user` using a [custom decorator](https://docs.nestjs.com/custom-decorators), and the metadata type of the user is `Object`. This behavior can be configured by specifying by `requestUser` option.

```ts
class UsersController extends new RestControllerFactory({
  // ...
  requestUser: { type: User, decorators: [RequestUser()] },
  // ...
}).product {}
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

It is recommended to create your own factory to reuse wonderful overridings by overriding the methods in the factory's protected `.createRawClass()` method.

```ts
class OwnServiceFactory<
  Entity = any,
  CreateDto = Entity,
  UpdateDto = CreateDto,
  LookupField extends LookupableField<Entity> = LookupableField<Entity>
> extends RestServiceFactory<Entity, CreateDto, UpdateDto, LookupField> {
  protected createRawClass() {
    return class RestService extends super.createRawClass() {
      // override methods here
    };
  }
}
```

**DONT** use mixins because metadata may be lost.

---

The service's methods are all designed to be able to be easily overridden to implement better things, you can find more usages by reading the source code.
