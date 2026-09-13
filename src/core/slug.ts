export function classSlug(className: string): string {
  return className.toLowerCase().replace(/\s+/g, "");
}
