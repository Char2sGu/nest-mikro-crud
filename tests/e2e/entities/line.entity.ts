import { Entity, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Page } from "./page.entity";

@Entity()
export class Line {
  @PrimaryKey()
  id!: number;

  @ManyToOne({
    entity: () => Page,
  })
  page!: Page;

  @Property()
  text!: string;
}
