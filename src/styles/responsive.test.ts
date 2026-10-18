import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync('src/styles/tokens.css', 'utf8');
const root = readFileSync('src/styles.css', 'utf8');
const mobile = readFileSync('src/styles/mobile.css', 'utf8');
const matiere = readFileSync('src/styles/matiere.css', 'utf8');
const workout = readFileSync('src/styles/workout.css', 'utf8');

describe('système responsive premium', () => {
  it('garde les tokens de mesure dans leurs bornes contractuelles', () => {
    expect(tokens).toMatch(/--measure-reading:\s*68ch/);
    expect(tokens).toMatch(/--measure-wide:\s*72rem/);
    expect(tokens).toMatch(/--fs-12:\s*2\.5rem/);
    expect(tokens).toMatch(/--sp-14:\s*48px/);
  });

  it('ne remet pas la validation en position statique', () => {
    expect(`${root}\n${mobile}\n${matiere}\n${workout}`).not.toMatch(
      /\.action-bar[^{}]*\{[^}]*position:\s*static/,
    );
    expect(mobile).toMatch(/\.workout-content \.primary-button\.full\.action-bar\s*\{[^}]*position:\s*sticky/);
  });

  it('protège le fond de page contre un degrade derrière du texte', () => {
    const body = root.match(/body[\s\S]*?\{[^}]*\}/)?.[0] ?? '';
    expect(body).toContain('background: #0b0f0e');
    expect(body).not.toMatch(/background:\s*[^;]*(?:gradient|radial|linear)/i);
  });

  it('prévoit les replis opaques pour les deux barres translucides', () => {
    const fallback = matiere.slice(matiere.indexOf('@supports not'));
    expect(fallback).toContain('.topbar::before');
    expect(fallback).toContain('.bottom-nav');
    expect(fallback).toContain('background: var(--surface-1)');
  });
});
