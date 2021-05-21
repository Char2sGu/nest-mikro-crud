import { Exclude } from "class-transformer";
import { RelationPath } from "src";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ChildEntity } from "./child.entity";

@Entity()
export class ParentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Exclude()
  @Column()
  name!: string;

  @OneToMany((type) => ChildEntity, (child) => child.parent)
  children!: ChildEntity[];
}
