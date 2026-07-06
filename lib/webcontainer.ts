import { WebContainer } from '@webcontainer/api';

let containerPromise: Promise<WebContainer> | null = null;

export async function getWebContainer(): Promise<WebContainer> {
  if (!containerPromise) {
    containerPromise = WebContainer.boot({
      coep: 'credentialless',
      workdirName: 'project',
    });
  }
  return containerPromise;
}

export async function bootProject(files: Record<string, string>): Promise<WebContainer> {
  const container = await getWebContainer();
  await container.mount(
    Object.fromEntries(
      Object.entries(files).map(([path, content]) => [path, { file: { contents: content } }])
    )
  );
  if (files['package.json']) {
    const process = await container.spawn('npm', ['install']);
    await process.exit;
  }
  return container;
}
