import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Produit, unProduit } from '@maison/catalogue/domaine';
import { beforeEach, describe, expect, it } from 'vitest';
import { CarteProduitComponent } from './carte-produit.component';

/**
 * Le formatage français insère des espaces insécables (U+00A0) et fines
 * insécables (U+202F). On les normalise pour que les assertions restent
 * lisibles — sans quoi « 1 096,50 » ne correspondrait jamais.
 */
function texte(fixture: { nativeElement: HTMLElement }): string {
  return (fixture.nativeElement.textContent ?? '').replace(/[\u00a0\u202f]/g, ' ');
}

async function monter(produit: Produit = unProduit()) {
  const fixture = TestBed.createComponent(CarteProduitComponent);
  fixture.componentRef.setInput('produit', produit);
  await fixture.whenStable();
  return fixture;
}

describe('CarteProduitComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'fr-FR' }],
    });
  });

  it('affiche le nom du produit', async () => {
    const fixture = await monter(unProduit({ nom: 'Canapé Sorel' }));

    expect(texte(fixture)).toContain('Canapé Sorel');
  });

  it('affiche le prix remisé quand une promotion est en cours', async () => {
    const fixture = await monter(unProduit({ prix: { catalogue: 1290, remisePourcent: 15 } }));

    expect(texte(fixture)).toContain('1 096,50 €');
  });

  it('barre le prix catalogue en cas de promotion', async () => {
    const fixture = await monter(unProduit({ prix: { catalogue: 1290, remisePourcent: 15 } }));

    expect(fixture.nativeElement.querySelector('s')).not.toBeNull();
  });

  it('n affiche aucun prix barré hors promotion', async () => {
    const fixture = await monter(unProduit({ prix: { catalogue: 249.9, remisePourcent: null } }));

    expect(fixture.nativeElement.querySelector('s')).toBeNull();
  });

  it('émet le produit au clic', async () => {
    const produit = unProduit();
    const fixture = await monter(produit);
    const emis: Produit[] = [];
    fixture.componentInstance.ajouter.subscribe((p) => emis.push(p));

    fixture.nativeElement.querySelector('button').click();

    expect(emis).toEqual([produit]);
  });

  it('désactive l ajout en rupture de stock', async () => {
    const fixture = await monter(unProduit({ stock: 0 }));

    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
  });

  it('n émet rien quand le produit est indisponible', async () => {
    const fixture = await monter(unProduit({ stock: 0 }));
    const emis: Produit[] = [];
    fixture.componentInstance.ajouter.subscribe((p) => emis.push(p));

    fixture.nativeElement.querySelector('button').click();

    expect(emis).toEqual([]);
  });
});
