import { BoxType } from "@prisma/client";

/** Accept UI sizes and persisted Prisma enums; never infer an unknown size. */
export function parseBoxType(value: unknown): BoxType | null {
  if (typeof value !== "string") return null;
  const key = value.startsWith("BOX_") ? value : `BOX_${value}`;
  return Object.values(BoxType).includes(key as BoxType) ? key as BoxType : null;
}
