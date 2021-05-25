import { Exclude } from "class-transformer";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ParentEntity } from "./parent.entity";

@Entity()
export class ChildEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Exclude()
  @ManyToOne(() => ParentEntity, (parent) => parent.children)
  parent!: ParentEntity;
}
