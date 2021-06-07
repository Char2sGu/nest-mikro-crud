import { ScalarPath } from "./scalar-path.type";

export type OrderQueryParam<Entity> = `${ScalarPath<Entity>}:${"asc" | "desc"}`;
