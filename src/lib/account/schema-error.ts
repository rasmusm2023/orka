export class SchemaMissingError extends Error {
  constructor() {
    super("The Kondis tables are not in the database yet.");
    this.name = "SchemaMissingError";
  }
}

export function isMissingSchema(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("schema cache") === true
  );
}
