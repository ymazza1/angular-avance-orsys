import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector, provideZonelessChangeDetection, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Commande, COMMANDE_VIDE } from '@maison/commande/domaine';
import { form } from '@angular/forms/signals';
import { beforeEach, describe, expect, it } from 'vitest';
import { schemaCommande } from './commande.schema';

const COMMANDE_COMPLETE: Commande = {
  email: 'camille@maison.co',
  nom: 'Camille Roux',
  adresse: '3 rue des Tilleuls',
  codePostal: '44840',
  ville: 'Les Sorinières',
  mode: 'domicile',
  accepteCgv: true,
};

/**
 * Le schéma se teste sans monter le composant : ni DOM, ni clic, ni fixture.
 * C'est l'apport principal des Signal Forms.
 */
function unFormulaire(valeurs: Partial<Commande> = {}) {
  const modele = signal<Commande>({ ...COMMANDE_VIDE, ...valeurs });
  const injecteur = TestBed.inject(Injector);
  const champs = runInInjectionContext(injecteur, () => form(modele, schemaCommande('/api')));
  return { modele, champs };
}

const messages = (erreurs: readonly { message?: string }[]) => erreurs.map((e) => e.message);

describe('schemaCommande', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('refuse un formulaire vide', () => {
    const { champs } = unFormulaire();

    expect(champs().invalid()).toBe(true);
  });

  it('ne trouve aucune erreur dans un formulaire complet', () => {
    const { champs } = unFormulaire(COMMANDE_COMPLETE);

    expect(champs().invalid()).toBe(false);
  });

  /**
   * Un formulaire dont une validation asynchrone est en cours n'est NI valide
   * NI invalide : il est en attente. Trois états, pas deux — et c'est ce qui
   * permet de désactiver la soumission sans afficher de message d'erreur.
   */
  it('reste en attente tant que la zone de livraison n est pas vérifiée', () => {
    const { champs } = unFormulaire(COMMANDE_COMPLETE);

    expect(champs.codePostal().pending()).toBe(true);
    expect(champs().valid()).toBe(false);
    expect(champs().invalid()).toBe(false);
  });

  it('exige l email', () => {
    const { champs } = unFormulaire({ ...COMMANDE_COMPLETE, email: '' });

    expect(messages(champs.email().errors())).toContain('Renseignez votre email');
  });

  it('refuse un email mal formé', () => {
    const { champs } = unFormulaire({ ...COMMANDE_COMPLETE, email: 'camille-arobase-maison' });

    expect(messages(champs.email().errors())).toContain('Cet email ne semble pas valide');
  });

  it('exige cinq chiffres pour le code postal', () => {
    const { champs } = unFormulaire({ ...COMMANDE_COMPLETE, codePostal: '448' });

    expect(messages(champs.codePostal().errors())).toContain('Cinq chiffres attendus');
  });

  it('exige l acceptation des CGV', () => {
    const { champs } = unFormulaire({ ...COMMANDE_COMPLETE, accepteCgv: false });

    expect(messages(champs.accepteCgv().errors())).toContain('Vous devez accepter les CGV');
  });

  it('exige l adresse et la ville', () => {
    const { champs } = unFormulaire({ ...COMMANDE_COMPLETE, adresse: '', ville: '' });

    expect(champs.adresse().invalid()).toBe(true);
    expect(champs.ville().invalid()).toBe(true);
  });

  it('n invalide pas un champ correct', () => {
    const { champs } = unFormulaire(COMMANDE_COMPLETE);

    expect(champs.email().errors()).toEqual([]);
    expect(champs.codePostal().errors()).toEqual([]);
  });

  it('suit les modifications du modèle', () => {
    const { modele, champs } = unFormulaire({ ...COMMANDE_COMPLETE, email: '' });
    expect(champs.email().invalid()).toBe(true);

    modele.update((c) => ({ ...c, email: 'camille@maison.co' }));

    expect(champs.email().invalid()).toBe(false);
  });

  it('n est pas touché tant que l utilisateur n a rien fait', () => {
    const { champs } = unFormulaire();

    expect(champs.email().touched()).toBe(false);
  });
});
