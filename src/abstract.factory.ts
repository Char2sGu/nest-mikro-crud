import { ClassConstructor } from "class-transformer";
import { TS_PARAM_TYPES_METADATA_KEY } from "./constants";
import { ExtractKeys } from "./utils";

type AllNames<T> = Extract<keyof T, string>;
type MethodNames<T> = Extract<ExtractKeys<T, (...args: any[]) => any>, string>;
type PropertyNames<T> = Exclude<AllNames<T>, MethodNames<T>>;

export abstract class AbstractFactory<T> {
  abstract readonly product: ClassConstructor<T>;

  defineParamTypesMetadata(
    target: MethodNames<T>,
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
    target: PropertyNames<T>,
    ...decorators: PropertyDecorator[]
  ): this {
    decorators.forEach((d) => d(this.product.prototype, target));
    return this;
  }

  applyMethodDecorators(
    target: MethodNames<T>,
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
    target: MethodNames<T>,
    index: number,
    ...decorators: ParameterDecorator[]
  ): this {
    decorators.forEach((d) => d(this.product.prototype, target, index));
    return this;
  }

  applyParamDecoratorSets(
    target: MethodNames<T>,
    ...decoratorSets: ParameterDecorator[][]
  ): this {
    decoratorSets.forEach((decorators, index) =>
      this.applyParamDecorators(target, index, ...decorators)
    );
    return this;
  }
}
