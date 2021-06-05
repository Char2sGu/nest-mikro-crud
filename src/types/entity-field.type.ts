import { Values } from "../utils";

export type EntityField<Entity> = Values<
  {
    [K in Extract<keyof Entity, string>]: Entity[K] extends Function
      ? never
      : K;
  }
>;
