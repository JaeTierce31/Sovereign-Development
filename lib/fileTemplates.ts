const FILENAME_TEMPLATES: Record<string, string> = {
  "package.json": `{\n  "name": "my-project",\n  "version": "1.0.0",\n  "scripts": {\n    "start": "node index.js",\n    "dev": "node --watch index.js"\n  }\n}\n`,
  ".gitignore": `node_modules/\n.env\n.env.local\ndist/\nbuild/\n.DS_Store\n*.log\n`,
  ".env": `# Environment variables\n# Never commit this file\n`,
  "Dockerfile": `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nEXPOSE 3000\nCMD ["node", "index.js"]\n`,
  "docker-compose.yml": `version: "3.9"\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n    environment:\n      - NODE_ENV=development\n`,
  "README.md": `# Project Name\n\nA brief description of your project.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm start\n\`\`\`\n\n## License\n\nMIT\n`,
  "tsconfig.json": `{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n    "moduleResolution": "NodeNext",\n    "strict": true,\n    "esModuleInterop": true,\n    "skipLibCheck": true,\n    "outDir": "dist"\n  },\n  "include": ["src/**/*", "*.ts"]\n}\n`,
};

const EXT_TEMPLATES: Record<string, (name: string) => string> = {
  ts: (name) => {
    const base = name.replace(/\.[^.]+$/, "");
    return `// ${base}\n\nexport {};\n`;
  },
  tsx: (name) => {
    const componentName = name
      .replace(/\.[^.]+$/, "")
      .split(/[-_/]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("");
    return `import React from "react";\n\nexport default function ${componentName}() {\n  return (\n    <div>\n      <h1>${componentName}</h1>\n    </div>\n  );\n}\n`;
  },
  jsx: (name) => {
    const componentName = name
      .replace(/\.[^.]+$/, "")
      .split(/[-_/]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("");
    return `import React from "react";\n\nexport default function ${componentName}() {\n  return (\n    <div>\n      <h1>${componentName}</h1>\n    </div>\n  );\n}\n`;
  },
  py: () => `def main():\n    pass\n\n\nif __name__ == "__main__":\n    main()\n`,
  sh: () => `#!/usr/bin/env bash\nset -euo pipefail\n\n`,
  css: () => `/* styles */\n`,
  html: (name) => {
    const title = name.replace(/\.[^.]+$/, "");
    return `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${title}</title>\n  </head>\n  <body>\n    \n  </body>\n</html>\n`;
  },
  sql: () => `-- SQL script\n\n`,
  yaml: () => `# YAML configuration\n`,
  yml: () => `# YAML configuration\n`,
  md: (name) => {
    const title = name
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return `# ${title}\n\n`;
  },
  json: () => `{\n}\n`,
  toml: () => `# TOML configuration\n`,
  rs: () => `fn main() {\n    println!("Hello, world!");\n}\n`,
  go: (name) => {
    const pkg = name.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "main";
    return `package ${pkg === "main" ? "main" : pkg}\n\nfunc main() {\n}\n`;
  },
  java: (name) => {
    const className = name
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "") ?? "Main";
    return `public class ${className} {\n    public static void main(String[] args) {\n    }\n}\n`;
  },
  rb: () => `# Ruby script\n\ndef main\nend\n\nmain\n`,
  php: () => `<?php\n\n`,
  swift: () => `import Foundation\n\n`,
  kt: () => `fun main() {\n}\n`,
};

export function getFileTemplate(filePath: string): string {
  const fileName = filePath.split("/").pop() ?? filePath;

  if (FILENAME_TEMPLATES[fileName]) return FILENAME_TEMPLATES[fileName];

  const ext = fileName.split(".").pop() ?? "";
  const gen = EXT_TEMPLATES[ext];
  return gen ? gen(fileName) : "";
}
