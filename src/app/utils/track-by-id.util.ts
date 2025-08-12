/**
 * Universal track function for *ngFor and @for.
 * Used to track list items by their unique `id` property.
 *
 * @param index - index of the element in the array (usually not needed)
 * @param item - object containing the `id` property
 * @returns the value of the `id` property for Angular trackBy
 */
export function trackById<T extends { id: number | string }>(
  index: number,
  item: T
): number | string {
  return item.id;
}
