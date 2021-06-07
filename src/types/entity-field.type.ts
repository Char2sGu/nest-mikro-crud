import { Values } from "../utils";

export type EntityField<Entity> = Values<
  {
    [K in string & keyof Entity]: Entity[K] extends Function ? never : K;
  }
>;
