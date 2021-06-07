export type ItemTypeIfArray<T> = T extends (infer R)[] ? R : T;
