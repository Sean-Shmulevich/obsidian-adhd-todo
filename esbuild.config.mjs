import fs from 'node:fs/promises';
import path from 'node:path';
import esbuild from 'esbuild';
import { compile, compileModule } from 'svelte/compiler';

const watch = process.argv.includes('--watch');

function svelte5Plugin() {
  return {
    name: 'svelte5-local',
    setup(build) {
      build.onResolve({ filter: /\.svelte(\.ts)?$/ }, (args) => {
        const resolved = path.isAbsolute(args.path)
          ? args.path
          : path.join(args.resolveDir, args.path);
        return { path: resolved };
      });

      build.onLoad({ filter: /\.svelte$/ }, async (args) => {
        const source = await fs.readFile(args.path, 'utf8');
        const result = compile(source, {
          filename: args.path,
          css: 'injected',
          generate: 'client',
          dev: watch,
          runes: true
        });
        return {
          contents: result.js.code,
          loader: 'js',
          warnings: (result.warnings ?? []).map((w) => ({ text: w.message }))
        };
      });

      build.onLoad({ filter: /\.svelte\.ts$/ }, async (args) => {
        const source = await fs.readFile(args.path, 'utf8');
        const stripped = await esbuild.transform(source, {
          loader: 'ts',
          format: 'esm',
          target: 'es2022'
        });
        const result = compileModule(stripped.code, {
          filename: args.path,
          dev: watch,
          generate: 'client'
        });
        return {
          contents: result.js.code,
          loader: 'js',
          warnings: (result.warnings ?? []).map((w) => ({ text: w.message }))
        };
      });
    }
  };
}

const ctx = await esbuild.context({
  entryPoints: ['main.ts'],
  bundle: true,
  outfile: 'main.js',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
  external: ['obsidian', 'electron', '@codemirror/*'],
  plugins: [svelte5Plugin()],
  loader: {
    '.css': 'css'
  }
});

if (watch) {
  await ctx.watch();
  console.log('Watching...');
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
