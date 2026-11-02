import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LignePanier } from '@maison/panier/domaine';
import { beforeEach, describe, expect, it } from 'vitest';
import { LignePanierComponent } from './ligne-panier.component';

function uneLigne(surcharges: Partial<LignePanier> = {}): LignePanier {
  return {
    produitId: 'p-001',
    nom: 'Étagère Kalix',
    prixUnitaire: 249.9,
    quantite: 2,
    stockDisponible: 12,
    poidsKg: 42,
    volumeM3: 0.38,
    ...surcharges,
  };
}

async function monter(ligne = uneLigne(), quantite = ligne.quantite) {
  const fixture = TestBed.createComponent(LignePanierComponent);
  fixture.componentRef.setInput('ligne', ligne);
  fixture.componentRef.setInput('quantite', quantite);
  await fixture.whenStable();
  return fixture;
}

const texte = (fixture: ComponentFixture<LignePanierComponent>) =>
  (fixture.nativeElement.textContent ?? '').replace(/[\u00a0\u202f]/g, ' ');

const champ = (fixture: ComponentFixture<LignePanierComponent>) =>
  fixture.nativeElement.querySelector('input') as HTMLInputElement;

describe('LignePanierComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'fr-FR' }],
    });
  });

  it('affiche le nom et le prix unitaire', async () => {
    const fixture = await monter();

    expect(texte(fixture)).toContain('Étagère Kalix');
    expect(texte(fixture)).toContain('249,90 €');
  });

  it('calcule le total de la ligne', async () => {
    const fixture = await monter(uneLigne(), 3);

    expect(texte(fixture)).toContain('749,70 €');
  });

  it('recalcule le total quand la quantité change', async () => {
    const fixture = await monter(uneLigne(), 1);

    fixture.componentRef.setInput('quantite', 4);
    await fixture.whenStable();

    expect(texte(fixture)).toContain('999,60 €');
  });

  it('émet la nouvelle quantité saisie', async () => {
    const fixture = await monter();
    const emises: number[] = [];
    fixture.componentInstance.quantite.subscribe((q) => emises.push(q));

    champ(fixture).value = '5';
    champ(fixture).dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(emises).toEqual([5]);
  });

  it('émet zéro sur une saisie vide', async () => {
    const fixture = await monter();
    const emises: number[] = [];
    fixture.componentInstance.quantite.subscribe((q) => emises.push(q));

    champ(fixture).value = '';
    champ(fixture).dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(emises).toEqual([0]);
  });

  it('borne la saisie au stock disponible', async () => {
    const fixture = await monter(uneLigne({ stockDisponible: 3 }));

    expect(champ(fixture).max).toBe('3');
  });

  it('signale que le stock maximum est atteint', async () => {
    const fixture = await monter(uneLigne({ stockDisponible: 3 }), 3);

    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  it('émet l identifiant à la suppression', async () => {
    const fixture = await monter();
    const supprimes: string[] = [];
    fixture.componentInstance.supprimer.subscribe((id) => supprimes.push(id));

    fixture.nativeElement.querySelector('button').click();

    expect(supprimes).toEqual(['p-001']);
  });
});
