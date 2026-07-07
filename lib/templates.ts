export interface Template {
  id: string;
  name: string;
  description: string;
  files: { path: string; content: string }[];
}

export const TEMPLATES: Template[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Empty project",
    files: [],
  },
  {
    id: "node",
    name: "Node.js",
    description: "Hello World with npm script",
    files: [
      {
        path: "index.js",
        content: `console.log("Hello from Peregrine!");\n`,
      },
      {
        path: "package.json",
        content: JSON.stringify({ name: "my-project", version: "1.0.0", scripts: { start: "node index.js" } }, null, 2) + "\n",
      },
    ],
  },
  {
    id: "typescript",
    name: "TypeScript",
    description: "TypeScript starter with tsx",
    files: [
      {
        path: "index.ts",
        content: `const greet = (name: string): string => \`Hello, \${name}!\`;\n\nconsole.log(greet("Peregrine"));\n`,
      },
      {
        path: "package.json",
        content: JSON.stringify({ name: "my-project", version: "1.0.0", devDependencies: { tsx: "latest", typescript: "latest" } }, null, 2) + "\n",
      },
    ],
  },
  {
    id: "python",
    name: "Python",
    description: "Python 3 script",
    files: [
      {
        path: "main.py",
        content: `def greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("Peregrine"))\n`,
      },
    ],
  },
  {
    id: "react",
    name: "React + Vite",
    description: "React component with Vite",
    files: [
      {
        path: "src/App.tsx",
        content: `import { useState } from "react";\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div style={{ padding: 32, fontFamily: "sans-serif" }}>\n      <h1>Peregrine App</h1>\n      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>\n    </div>\n  );\n}\n`,
      },
      {
        path: "src/main.tsx",
        content: `import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode><App /></React.StrictMode>\n);\n`,
      },
      {
        path: "index.html",
        content: `<!DOCTYPE html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><title>Peregrine App</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n`,
      },
      {
        path: "package.json",
        content: JSON.stringify({ name: "my-app", version: "1.0.0", scripts: { dev: "vite", build: "vite build" }, dependencies: { react: "^18.2.0", "react-dom": "^18.2.0" }, devDependencies: { "@vitejs/plugin-react": "^4.0.0", vite: "^5.0.0", typescript: "^5.0.0" } }, null, 2) + "\n",
      },
    ],
  },
  {
    id: "bash",
    name: "Shell Script",
    description: "Bash automation script",
    files: [
      {
        path: "run.sh",
        content: `#!/usr/bin/env bash\nset -euo pipefail\n\necho "Hello from Peregrine!"\necho "Date: $(date)"\n`,
      },
    ],
  },
];
