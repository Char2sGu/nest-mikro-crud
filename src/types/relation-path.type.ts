import { ExtractPath } from "../utils";

/**
 * Try it by yourself?
 * @example
 * interface User {
 *   id: number;
 *   classroomsCreated: Collection<Classroom>;
 *   joinApplications: Collection<JoinApplication>;
 *   memberships: Collection<Membership>;
 *   createdAt: Date;
 *   updatedAt: Date;
 * }
 *
 * interface Membership {
 *   id: number;
 *   owner: User;
 *   classroom: Classroom;
 *   createdAt: Date;
 *   updatedAt: Date;
 * }
 *
 * interface Classroom {
 *   id: number;
 *   creator: User;
 *   joinApplications: Collection<JoinApplication>;
 *   memberships: Collection<Membership>;
 *   createdAt: Date;
 *   updatedAt: Date;
 * }
 *
 * interface JoinApplication {
 *   id: number;
 *   owner: User;
 *   classroom: Classroom;
 *   createdAt: Date;
 *   updatedAt: Date;
 * }
 *
 * type T = RelationPath<Membership>;
 */
export type RelationPath<Entity> = ExtractPath<
  Entity,
  null | Record<string, any>,
  Function | Date
>;
