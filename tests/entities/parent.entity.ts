import { Exclude } from "class-transformer";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ChildEntity } from "./child.entity";

@Entity()
export class ParentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Exclude()
  @Column()
  secret!: string;

  @OneToMany(() => ChildEntity, (child) => child.parent, { cascade: true })
  children!: ChildEntity[];
}
