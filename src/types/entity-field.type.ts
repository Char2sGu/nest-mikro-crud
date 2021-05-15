import { EntityFieldsNames } from "typeorm/common/EntityFieldsNames";

export type EntityField<Entity> = Extract<EntityFieldsNames<Entity>, string>;
