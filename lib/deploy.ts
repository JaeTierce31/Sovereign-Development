export async function deployProject(projectId: string, files: Record<string, string>) {
  const formData = new FormData();
  for (const [path, content] of Object.entries(files)) {
    formData.append(path, new Blob([content], { type: "text/plain" }));
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/pages/projects`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}` },
      body: JSON.stringify({ name: `project-${projectId}`, production_branch: "main" }),
    }
  );
  const { id } = await res.json();

  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/pages/projects/${id}/deployments`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}` },
      body: formData,
    }
  );

  return `https://${projectId}.pages.dev`;
}
