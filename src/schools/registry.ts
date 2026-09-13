import type { SchoolAdapter } from "../core/types.ts";
import { sp143 } from "./sp143/index.ts";

const schools: Record<string, SchoolAdapter> = {
  sp143,
};

export function listSchools(): SchoolAdapter[] {
  return Object.values(schools);
}

export function getSchool(id: string): SchoolAdapter {
  const school = schools[id.toLowerCase()];
  if (!school) {
    const available = listSchools()
      .map((item) => item.id)
      .join(", ");
    throw new Error(`Nieznana szkoła: ${id}. Dostępne: ${available}`);
  }
  return school;
}
