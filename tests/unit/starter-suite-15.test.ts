import { TemplateScaffoldEngine_15 } from '../../lib/generator/templates/starter-pack-15';

export async function runSuite_15(): Promise<Array<{ name: string; passed: boolean; error?: string }>> {
  const engine = new TemplateScaffoldEngine_15({
    projectName: 'test-app-15',
    authProvider: 'next-auth',
    databaseDriver: 'pg',
    enableTailwind: true,
    enableTrpc: true,
    enablePwa: false
  });

  const manifest = engine.generateProjectManifest();
  const routes = engine.scaffoldRoutes();

  return [
    { name: 'TemplateScaffoldEngine_15 generates valid package manifest', passed: !!manifest['package.json'] },
    { name: 'TemplateScaffoldEngine_15 generates valid tsconfig manifest', passed: !!manifest['tsconfig.json'] },
    { name: 'TemplateScaffoldEngine_15 generates valid page routes', passed: routes.length >= 2 },
    { name: 'TemplateScaffoldEngine_15 contains health check route', passed: routes.some((r) => r.route === '/api/health') }
  ];
}
