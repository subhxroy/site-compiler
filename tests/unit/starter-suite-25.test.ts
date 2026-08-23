import { TemplateScaffoldEngine_25 } from '../../lib/generator/templates/starter-pack-25';

export async function runSuite_25(): Promise<Array<{ name: string; passed: boolean; error?: string }>> {
  const engine = new TemplateScaffoldEngine_25({
    projectName: 'test-app-25',
    authProvider: 'next-auth',
    databaseDriver: 'pg',
    enableTailwind: true,
    enableTrpc: true,
    enablePwa: false
  });

  const manifest = engine.generateProjectManifest();
  const routes = engine.scaffoldRoutes();

  return [
    { name: 'TemplateScaffoldEngine_25 generates valid package manifest', passed: !!manifest['package.json'] },
    { name: 'TemplateScaffoldEngine_25 generates valid tsconfig manifest', passed: !!manifest['tsconfig.json'] },
    { name: 'TemplateScaffoldEngine_25 generates valid page routes', passed: routes.length >= 2 },
    { name: 'TemplateScaffoldEngine_25 contains health check route', passed: routes.some((r) => r.route === '/api/health') }
  ];
}
