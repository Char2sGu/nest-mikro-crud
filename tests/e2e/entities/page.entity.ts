import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { Book } from "./book.entity";
import { Line } from "./line.entity";

@Entity()
export class Page {
  @PrimaryKey()
  id!: number;

  @ManyToOne({
    entity: () => Book,
  })
  book!: Book;

  @OneToMany({
    entity: () => Line,
    mappedBy: (line) => line.page,
  })
  lines = new Collection<Line>(this);

  @Property()
  number!: number;
}
