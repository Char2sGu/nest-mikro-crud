import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ParentEntity } from "./parent.entity";

@Entity()
export class ChildEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @ManyToOne((type) => ParentEntity, (parent) => parent.children, {
    cascade: true,
  })
  parent!: ParentEntity;
}
