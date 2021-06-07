import {
  BaseEntity,
  Entity,
  OneToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { Book } from "./book.entity";

@Entity()
export class Summary extends BaseEntity<Summary, "id"> {
  @PrimaryKey()
  id!: number;

  @OneToOne({
    entity: () => Book,
    mappedBy: (book) => book.summary,
  })
  book!: Book;

  @Property()
  text!: string;
}
