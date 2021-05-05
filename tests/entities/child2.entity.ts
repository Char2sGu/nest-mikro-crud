import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { ParentEntity } from "./parent.entity";

@Entity()
export class Child2Entity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @OneToOne((type) => ParentEntity, (parent) => parent.child2)
  parent!: ParentEntity;
}
