import { TemplateScaffoldEngine_14 } from '../../lib/generator/templates/starter-pack-14';

export async function runSuite_14(): Promise<Array<{ name: string; passed: boolean; error?: string }>> {
  const engine = new TemplateScaffoldEngine_14({
    projectName: 'test-app-14',
    authProvider: 'next-auth',
    databaseDriver: 'pg',
    enableTailwind: true,
    enableTrpc: true,
    enablePwa: false
  });

  const manifest = engine.generateProjectManifest();
  const routes = engine.scaffoldRoutes();

  return [
    { name: 'TemplateScaffoldEngine_14 generates valid package manifest', passed: !!manifest['package.json'] },
    { name: 'TemplateScaffoldEngine_14 generates valid tsconfig manifest', passed: !!manifest['tsconfig.json'] },
    { name: 'TemplateScaffoldEngine_14 generates valid page routes', passed: routes.length >= 2 },
    { name: 'TemplateScaffoldEngine_14 contains health check route', passed: routes.some((r) => r.route === '/api/health') }
  ];
}
