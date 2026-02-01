/**
 * Context types for Typed Policy v0.2
 *
 * Separates actor (user/requester) from subject (resource)
 * for better authorization modeling.
 */

/**
 * Actor context - represents the user or entity making the request
 * Developers define their own actor shape based on their application
 *
 * @example
 * type MyActor = {
 *   user: {
 *     id: string;
 *     role: "admin" | "user" | "moderator";
 *     organizationId: string;
 *   };
 * };
 */
export type ActorContext = {
  user: {
    id: string;
    role: "admin" | "user";
  };
};

/**
 * Subject context - represents the resource being accessed
 * Developers define their own subject shape based on their data model
 *
 * @example
 * type MySubject = {
 *   post: {
 *     id: string;
 *     ownerId: string;
 *     published: boolean;
 *     organizationId: string;
 *   };
 * };
 */
export type SubjectContext = {
  post: {
    id: string;
    ownerId: string;
    published: boolean;
  };
};

/**
 * Full context combining actor and subject
 * Used internally but developers typically use separate Actor/Subject types
 */
export type FullContext<A, S> = A & S;

/**
 * Evaluation context passed to policy functions
 * Functions receive both actor and subject to make authorization decisions
 */
export type EvalContext<A, S> = {
  /** The actor (user) making the request */
  actor: A;
  /** The subject (resource) being accessed */
  subject: S;
};
