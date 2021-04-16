export type Resolved<P extends Promise<unknown>> = P extends Promise<infer T>
  ? T
  : never;
