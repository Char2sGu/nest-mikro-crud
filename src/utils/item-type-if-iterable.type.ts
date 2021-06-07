export type ItemTypeIfIterable<T> = T extends Iterable<infer R> ? R : T;
