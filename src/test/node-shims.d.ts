/**
 * Déclarations minimales pour les API Node utilisées par les TESTS uniquement.
 *
 * L'application cible le navigateur et n'embarque donc pas @types/node. Vitest,
 * lui, s'exécute dans Node : certains tests ont besoin de vérifier l'existence
 * réelle d'un fichier (par exemple les illustrations d'exercices). On déclare
 * ici le strict nécessaire, sans élargir les types globaux de l'application.
 */

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
}

declare module 'node:path' {
  export function resolve(...parts: string[]): string;
}

declare const process: { cwd(): string };
