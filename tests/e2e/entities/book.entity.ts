import {
  Collection,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { Page } from "./page.entity";
import { Summary } from "./summary.entity";

@Entity()
export class Book {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @Property({
    nullable: true,
  })
  alias!: string | null;

  @Property({
    hidden: true,
  })
  price!: number;

  @OneToMany({
    entity: () => Page,
    mappedBy: (page) => page.book,
  })
  pages = new Collection<Page>(this);

  @OneToOne({
    entity: () => Summary,
    mappedBy: (summary) => summary.book,
    owner: true,
  })
  summary!: Summary;
}
