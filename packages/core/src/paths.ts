export type Primitive = string | number | boolean | null | undefined;

export type Path<T> = T extends Primitive
  ? never
  : {
      [K in keyof T & string]: T[K] extends Primitive ? K : K | `${K}.${Path<T[K]>}`;
    }[keyof T & string];
