import type { PolicyContext } from "@typed-policy/core";
import { evaluate } from "@typed-policy/eval";
import { useState } from "react";
import { postPolicy } from "./policies";
import "./App.css";

function App() {
  const [userRole, setUserRole] = useState<"admin" | "user">("user");
  const [userId, setUserId] = useState("user-1");
  const [postOwnerId, setPostOwnerId] = useState("user-1");
  const [postPublished, setPostPublished] = useState(true);

  const context: PolicyContext = {
    user: { id: userId, role: userRole },
    post: {
      id: "post-1",
      ownerId: postOwnerId,
      published: postPublished,
    },
  };

  const canRead = evaluate(postPolicy.actions.read, context as Record<string, unknown>);
  const canWrite = evaluate(postPolicy.actions.write, context as Record<string, unknown>);
  const canDelete = evaluate(postPolicy.actions.delete, context as Record<string, unknown>);

  return (
    <div className="app">
      <h1>Typed Policy - React Example</h1>

      <div className="controls">
        <h2>User Context</h2>
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

        <h2>Post Context</h2>
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
          Read: {canRead ? "GRANTED" : "DENIED"}
        </div>
        <div className={`permission ${canWrite ? "granted" : "denied"}`}>
          Write: {canWrite ? "GRANTED" : "DENIED"}
        </div>
        <div className={`permission ${canDelete ? "granted" : "denied"}`}>
          Delete: {canDelete ? "GRANTED" : "DENIED"}
        </div>
      </div>

      <div className="code-preview">
        <h2>Policy Definition</h2>
        <pre>{`export const postPolicy = policy<PolicyContext>({
  subject: "Post",
  actions: {
    read: or(
      eq("user.role", "admin"),
      eq("post.published", true),
      eq("post.ownerId", "user.id")
    ),
    write: or(
      eq("user.role", "admin"),
      and(
        eq("post.ownerId", "user.id"),
        eq("post.published", false)
      )
    ),
    delete: or(
      eq("user.role", "admin"),
      eq("post.ownerId", "user.id")
    )
  }
});`}</pre>
      </div>
    </div>
  );
}

export default App;
