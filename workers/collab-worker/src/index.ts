import { DurableObject } from "cloudflare:workers";

interface Env {
  PROJECTS: DurableObjectNamespace;
}

export class ProjectDO extends DurableObject {
  private sessions: Map<string, WebSocket>;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.sessions = new Map();
  }

  async initialize() {
    this.ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      payload BLOB NOT NULL,
      timestamp INTEGER NOT NULL
    )`);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/ws")) {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const userId = url.searchParams.get("user") || "anonymous";
      this.sessions.set(userId, server);

      server.accept();
      server.addEventListener("message", (event) => {
        for (const [id, ws] of this.sessions) {
          if (id !== userId) ws.send(event.data);
        }

        this.ctx.storage.sql.exec(
          "INSERT INTO operations (user_id, payload, timestamp) VALUES (?, ?, ?)",
          userId, event.data as string, Date.now()
        );
      });
      server.addEventListener("close", () => this.sessions.delete(userId));

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Peregrine Collaboration Worker", { status: 200 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project") || "default";
    const id = env.PROJECTS.idFromName(projectId);
    const stub = env.PROJECTS.get(id);
    return stub.fetch(request);
  },
};
