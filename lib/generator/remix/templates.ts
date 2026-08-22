export function generateRemixViteConfig(): string {
  return `import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
});
`;
}

export function generateRemixPackageJson(projectName: string = 'sitecompiler-remix-export'): string {
  return JSON.stringify(
    {
      name: projectName,
      private: true,
      sideEffects: false,
      type: 'module',
      scripts: {
        build: 'remix vite:build',
        dev: 'remix vite:dev',
        start: 'remix-serve ./build/server/index.js',
        typecheck: 'tsc',
      },
      dependencies: {
        '@remix-run/node': '^2.13.1',
        '@remix-run/react': '^2.13.1',
        '@remix-run/serve': '^2.13.1',
        isbot: '^4.1.0',
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'lucide-react': '^0.468.0',
      },
      devDependencies: {
        '@remix-run/dev': '^2.13.1',
        '@types/react': '^18.2.20',
        '@types/react-dom': '^18.2.7',
        typescript: '^5.6.3',
        vite: '^5.1.0',
        'vite-tsconfig-paths': '^4.2.1',
        tailwindcss: '^3.4.14',
      },
    },
    null,
    2
  );
}

export function generateRemixRoot(): string {
  return `import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import stylesheet from "~/tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-[#0d0e12] text-[#e1e2e5] antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
`;
}
