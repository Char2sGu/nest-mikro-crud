import {
  BaseEntity,
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { Page } from "./page.entity";

@Entity()
export class Book extends BaseEntity<Book, "id"> {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @Property({ hidden: true })
  price!: number;

  @OneToMany({ entity: () => Page, mappedBy: (child) => child.book })
  pages = new Collection<Page>(this);
}
