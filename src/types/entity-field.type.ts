import { ValueOf } from "../utils";

export type EntityField<Entity> = ValueOf<
  {
    [K in string & keyof Entity]: Entity[K] extends Function ? never : K;
  }
>;
