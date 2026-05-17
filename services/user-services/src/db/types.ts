import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type User = {
    id: Generated<string>;
    name: string;
    email: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    deletedAt: Timestamp | null;
};
export type DB = {
    User: User;
};
