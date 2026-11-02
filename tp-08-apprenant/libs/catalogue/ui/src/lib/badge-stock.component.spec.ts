import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { BadgeStockComponent } from './badge-stock.component';

async function monter(quantite: number | null): Promise<ComponentFixture<BadgeStockComponent>> {
  const fixture = TestBed.createComponent(BadgeStockComponent);
  fixture.componentRef.setInput('quantite', quantite);
  await fixture.whenStable();
  return fixture;
}

const texte = (fixture: ComponentFixture<BadgeStockComponent>) =>
  (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('BadgeStockComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('distingue le stock non chargé de la rupture', async () => {
    expect(texte(await monter(null))).toContain('vérification');
  });

  it('annonce la rupture à zéro', async () => {
    expect(texte(await monter(0))).toContain('Rupture');
  });

  it('avertit quand le stock est tendu', async () => {
    expect(texte(await monter(3))).toContain('Plus que 3');
  });

  it('annonce la disponibilité au-delà du seuil', async () => {
    expect(texte(await monter(12))).toContain('En stock (12)');
  });

  it('expose un rôle accessible', async () => {
    const fixture = await monter(12);

    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  /**
   * LE test du TP : aucun `detectChanges()`. En zoneless, c'est le changement
   * de l'entrée signal qui marque la vue — rien d'autre.
   */
  it('se rafraîchit sans detectChanges quand l entrée change', async () => {
    const fixture = await monter(12);
    expect(texte(fixture)).toContain('En stock (12)');

    fixture.componentRef.setInput('quantite', 0);
    await fixture.whenStable();

    expect(texte(fixture)).toContain('Rupture');
  });

  it('reflète les passages successifs par tous les niveaux', async () => {
    const fixture = await monter(null);

    for (const [quantite, attendu] of [[0, 'Rupture'], [2, 'Plus que 2'], [30, 'En stock (30)']] as const) {
      fixture.componentRef.setInput('quantite', quantite);
      await fixture.whenStable();

      expect(texte(fixture)).toContain(attendu);
    }
  });
});
