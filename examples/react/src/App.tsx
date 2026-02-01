import { evaluate } from "@typed-policy/eval";
import { useState } from "react";
import { postPolicy, type Actor, type Subject } from "./policies.js";
import "./App.css";

function App() {
  const [userRole, setUserRole] = useState<"admin" | "user">("user");
  const [userId, setUserId] = useState("user-1");
  const [postOwnerId, setPostOwnerId] = useState("user-1");
  const [postPublished, setPostPublished] = useState(true);

  const actor: Actor = {
    user: { id: userId, role: userRole },
  };

  const subject: Subject = {
    post: {
      id: "post-1",
      ownerId: postOwnerId,
      published: postPublished,
    },
  };

  // v0.2 API: Pass actor and subject separately in context object
  const canRead = evaluate(postPolicy.actions.read, { actor, subject });
  const canWrite = evaluate(postPolicy.actions.write, { actor, subject });
  const canDelete = evaluate(postPolicy.actions.delete, { actor, subject });
  const alwaysAllow = evaluate(postPolicy.actions.alwaysAllow, { actor, subject });
  const neverAllow = evaluate(postPolicy.actions.neverAllow, { actor, subject });

  return (
    <div className="app">
      <h1>Typed Policy - React Example (v0.2)</h1>

      <div className="controls">
        <h2>Actor Context (User)</h2>
        <div className="control-group">
          <label>User Role:</label>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as "admin" | "user")}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="control-group">
          <label>User ID:</label>
          <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} />
        </div>

        <h2>Subject Context (Post)</h2>
        <div className="control-group">
          <label>Post Owner ID:</label>
          <input type="text" value={postOwnerId} onChange={(e) => setPostOwnerId(e.target.value)} />
        </div>
        <div className="control-group">
          <label>Published:</label>
          <input
            type="checkbox"
            checked={postPublished}
            onChange={(e) => setPostPublished(e.target.checked)}
          />
        </div>
      </div>

      <div className="results">
        <h2>Policy Results</h2>
        <div className={`permission ${canRead ? "granted" : "denied"}`}>
          Read (Function): {canRead ? "GRANTED" : "DENIED"}
        </div>
        <div className={`permission ${canWrite ? "granted" : "denied"}`}>
          Write (Function): {canWrite ? "GRANTED" : "DENIED"}
        </div>
        <div className={`permission ${canDelete ? "granted" : "denied"}`}>
          Delete (Function): {canDelete ? "GRANTED" : "DENIED"}
        </div>
        <div className={`permission ${alwaysAllow ? "granted" : "denied"}`}>
          Always Allow (Literal): {alwaysAllow ? "GRANTED" : "DENIED"}
        </div>
        <div className={`permission ${neverAllow ? "granted" : "denied"}`}>
          Never Allow (Literal): {neverAllow ? "GRANTED" : "DENIED"}
        </div>
      </div>

      <div className="code-preview">
        <h2>Policy Definition (v0.2 API)</h2>
        <pre>{`// Three policy styles:

// 1. Functions: Pure functions with actor/subject
read: ({ actor, subject }) => {
  if (actor.user.role === "admin") return true;
  return subject.post.published || 
         subject.post.ownerId === actor.user.id;
}

// 2. Declarative: Using DSL operators
adminOnly: or(
  eq("post.published", true), 
  eq("post.ownerId", "user.id")
)

// 3. Literals: Boolean values
alwaysAllow: true,
neverAllow: false`}</pre>
      </div>

      <div className="code-preview">
        <h2>Evaluate Usage</h2>
        <pre>{`const actor = { user: { id: "user-1", role: "user" } };
const subject = { post: { id: "post-1", ownerId: "user-1", published: true } };

// v0.2 API: Pass actor and subject separately
const canRead = evaluate(
  postPolicy.actions.read, 
  { actor, subject }
);`}</pre>
      </div>
    </div>
  );
}

export default App;
