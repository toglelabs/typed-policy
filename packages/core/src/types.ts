import type { Path } from "./paths.js";

export type { Path } from "./paths.js";

export type PathValue<T, P extends Path<T>> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Extract<Rest, Path<T[K]>>>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export type PolicyContext = {
  user: {
    id: string;
    role: "admin" | "user";
  };
  post: {
    id: string;
    ownerId: string;
    published: boolean;
  };
};
