import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { ParentEntity } from "./parent.entity";

@Entity()
export class ChildEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @OneToOne((type) => ParentEntity, (parent) => parent.child)
  parent!: ParentEntity;
}
