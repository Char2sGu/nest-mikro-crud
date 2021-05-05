import { Exclude } from "class-transformer";
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Child1Entity } from "./child1.entity";
import { Child2Entity } from "./child2.entity";

@Entity()
export class ParentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Exclude()
  @Column()
  name!: string;

  @OneToOne((type) => Child1Entity, (child) => child.parent, { cascade: true })
  @JoinColumn()
  child1!: Child1Entity;

  @OneToOne((type) => Child2Entity, (child) => child.parent, { cascade: true })
  @JoinColumn()
  child2!: Child2Entity;
}
