import { TemplateScaffoldEngine_2 } from '../../lib/generator/templates/starter-pack-2';

export async function runSuite_2(): Promise<Array<{ name: string; passed: boolean; error?: string }>> {
  const engine = new TemplateScaffoldEngine_2({
    projectName: 'test-app-2',
    authProvider: 'next-auth',
    databaseDriver: 'pg',
    enableTailwind: true,
    enableTrpc: true,
    enablePwa: false
  });

  const manifest = engine.generateProjectManifest();
  const routes = engine.scaffoldRoutes();

  return [
    { name: 'TemplateScaffoldEngine_2 generates valid package manifest', passed: !!manifest['package.json'] },
    { name: 'TemplateScaffoldEngine_2 generates valid tsconfig manifest', passed: !!manifest['tsconfig.json'] },
    { name: 'TemplateScaffoldEngine_2 generates valid page routes', passed: routes.length >= 2 },
    { name: 'TemplateScaffoldEngine_2 contains health check route', passed: routes.some((r) => r.route === '/api/health') }
  ];
}
