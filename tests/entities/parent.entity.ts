import { Exclude } from "class-transformer";
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ChildEntity } from "./child.entity";

@Entity()
export class ParentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Exclude()
  @Column()
  name!: string;

  @OneToOne((type) => ChildEntity, (child) => child.parent, { cascade: true })
  @JoinColumn()
  child!: ChildEntity;
}
