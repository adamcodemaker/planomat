export function pathSlug(segment: string): string {
  return segment.toLowerCase().replace(/\s+/g, "");
}
