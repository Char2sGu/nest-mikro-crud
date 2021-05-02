import { ClassConstructor } from "class-transformer";
import { TS_PARAM_TYPES_METADATA_KEY } from "./constants";
import { ExtractKeys } from "./utils";

type MethodKeys<T> = Extract<ExtractKeys<T, (...args: any[]) => any>, string>;
type PropertyKeys<T> = Exclude<Extract<keyof T, string>, MethodKeys<T>>;

export abstract class AbstractFactory<T> {
  abstract readonly product: ClassConstructor<T>;

  defineParamTypesMetadata(
    target: MethodKeys<T>,
    ...types: ClassConstructor<unknown>[]
  ): this {
    Reflect.defineMetadata(
      TS_PARAM_TYPES_METADATA_KEY,
      types,
      this.product.prototype,
      target
    );

    return this;
  }

  applyClassDecorators(...decorators: ClassDecorator[]): this {
    decorators.forEach((d) => d(this.product));
    return this;
  }

  applyPropertyDecorators(
    target: PropertyKeys<T>,
    ...decorators: PropertyDecorator[]
  ): this {
    decorators.forEach((d) => d(this.product.prototype, target));
    return this;
  }

  applyMethodDecorators(
    target: MethodKeys<T>,
    ...decorators: MethodDecorator[]
  ): this {
    decorators.forEach((d) =>
      d(
        this.product.prototype,
        target,
        Object.getOwnPropertyDescriptor(this.product.prototype, target)!
      )
    );
    return this;
  }

  applyParamDecorators(
    target: MethodKeys<T>,
    index: number,
    ...decorators: ParameterDecorator[]
  ): this {
    decorators.forEach((d) => d(this.product.prototype, target, index));
    return this;
  }

  applyParamDecoratorSets(
    target: MethodKeys<T>,
    ...decoratorSets: ParameterDecorator[][]
  ): this {
    decoratorSets.forEach((decorators, index) =>
      this.applyParamDecorators(target, index, ...decorators)
    );
    return this;
  }
}
