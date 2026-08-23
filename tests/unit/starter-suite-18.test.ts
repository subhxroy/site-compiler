import { TemplateScaffoldEngine_18 } from '../../lib/generator/templates/starter-pack-18';

export async function runSuite_18(): Promise<Array<{ name: string; passed: boolean; error?: string }>> {
  const engine = new TemplateScaffoldEngine_18({
    projectName: 'test-app-18',
    authProvider: 'next-auth',
    databaseDriver: 'pg',
    enableTailwind: true,
    enableTrpc: true,
    enablePwa: false
  });

  const manifest = engine.generateProjectManifest();
  const routes = engine.scaffoldRoutes();

  return [
    { name: 'TemplateScaffoldEngine_18 generates valid package manifest', passed: !!manifest['package.json'] },
    { name: 'TemplateScaffoldEngine_18 generates valid tsconfig manifest', passed: !!manifest['tsconfig.json'] },
    { name: 'TemplateScaffoldEngine_18 generates valid page routes', passed: routes.length >= 2 },
    { name: 'TemplateScaffoldEngine_18 contains health check route', passed: routes.some((r) => r.route === '/api/health') }
  ];
}
