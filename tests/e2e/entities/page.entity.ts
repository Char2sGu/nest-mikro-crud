import {
  BaseEntity,
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { Book } from "./book.entity";

@Entity()
export class Page extends BaseEntity<Page, "id"> {
  @PrimaryKey()
  id!: number;

  @ManyToOne({ entity: () => Book })
  book!: Book;

  @Property()
  text!: string;
}
