export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}