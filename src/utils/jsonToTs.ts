export function jsonToTs(obj: unknown, rootName: string = "RootObject"): string {
  if (typeof obj !== "object" || obj === null) return "any";
  return `interface ${rootName} ${toInterface(obj)}`;
}

function toInterface(obj: unknown): string {
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "any[]";
    return `${toType(obj[0])}[]`;
  } else if (typeof obj === "object" && obj !== null) {
    const props = Object.entries(obj).map(([key, value]) => {
      return `  ${key}: ${toType(value)};`;
    });
    return `{\n${props.join("\n")}\n}`;
  }
  return "any";
}

function toType(value: unknown): string {
  if (Array.isArray(value)) {
    return toInterface(value);
  } else if (typeof value === "object" && value !== null) {
    return toInterface(value);
  } else if (typeof value === "string") {
    return "string";
  } else if (typeof value === "number") {
    return "number";
  } else if (typeof value === "boolean") {
    return "boolean";
  } else {
    return "any";
  }
}

