import { Repository } from "typeorm";

export const insertEntities = <T>(
  repository: Repository<T>,
  handler: (i: number) => T | Promise<T>
) => async (count: number) => {
  const entities: T[] = [];
  for (let i = 1; i <= count; i++) {
    const entity = repository.create(await handler(i));
    entities.push(await repository.save(entity));
  }
  return { entities, reinsert: () => repository.insert(entities) };
};
