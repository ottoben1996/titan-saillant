import { describe, expect, it } from 'vitest';
import viteConfig from '../vite.config';

type ViteConfigFactory = (environment: {
  command: 'build' | 'serve';
  mode: string;
  isSsrBuild: boolean;
  isPreview: boolean;
}) => { base?: string };

const resolvedViteConfig = viteConfig as unknown as { base?: string } | ViteConfigFactory;

function resolveBase(command: 'build' | 'serve') {
  if (typeof resolvedViteConfig !== 'function') return resolvedViteConfig.base;
  return resolvedViteConfig({
    command,
    mode: command === 'build' ? 'production' : 'development',
    isSsrBuild: false,
    isPreview: false,
  }).base;
}

describe('configuration Vite', () => {
  it('construit pour le sous-chemin GitHub Pages sans variable manuelle', () => {
    expect(resolveBase('build')).toBe('/titan-saillant/');
  });

  it('conserve la racine pour le serveur de développement local', () => {
    expect(resolveBase('serve')).toBe('/');
  });
});
