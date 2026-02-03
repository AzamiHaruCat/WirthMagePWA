export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface Serializable<T extends JsonValue> {
  serialize: () => T;
  unserialize: (value: T) => void;
}
