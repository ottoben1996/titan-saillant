/**
 * Déclaration minimale pour les tests qui lisent le dépôt sur le disque.
 *
 * Le typecheck de l'application est configuré pour le navigateur : ajouter tous
 * les types Node au projet ouvrirait la porte à des appels Node dans du code
 * qui doit tourner dans un téléphone. Ici, seules les fonctions utilisées sont
 * déclarées, et uniquement pour le typecheck des tests.
 */
declare module 'node:fs' {
  export function readFileSync(chemin: string, encodage: string): string;
  export function readdirSync(chemin: string, options?: { recursive?: boolean }): string[];
}
