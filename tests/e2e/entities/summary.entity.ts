import { Entity, OneToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Book } from "./book.entity";

@Entity()
export class Summary {
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
