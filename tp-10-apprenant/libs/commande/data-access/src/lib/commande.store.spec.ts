import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { unProduit } from '@maison/catalogue/domaine';
import { Commande, COMMANDE_VIDE } from '@maison/commande/domaine';
import { fournirStrategiesLivraison } from '@maison/livraison/data-access';
import { PanierStore } from '@maison/panier/data-access';
import { ajouter, Panier, PANIER_VIDE } from '@maison/panier/domaine';
import { API_URL } from '@maison/partage/util';
import { beforeEach, describe, expect, it } from 'vitest';
import { CommandeStore } from './commande.store';

const COMMANDE: Commande = {
  ...COMMANDE_VIDE,
  email: 'camille@maison.co',
  nom: 'Camille Roux',
  adresse: '3 rue des Tilleuls',
  codePostal: '44840',
  ville: 'Les Sorinières',
  accepteCgv: true,
};

const ETAGERE = unProduit({ id: 'p-001', stock: 12 });
const UN_PANIER: Panier = ajouter(PANIER_VIDE, ETAGERE, 2);

describe('CommandeStore', () => {
  let http: HttpTestingController;
  let store: CommandeStore;
  let panier: PanierStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        fournirStrategiesLivraison(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(CommandeStore);
    panier = TestBed.inject(PanierStore);
  });

  describe('succès', () => {
    it('envoie la commande et renvoie la référence', async () => {
      const promesse = store.envoyer(COMMANDE, UN_PANIER);
      http.expectOne('/api/commandes').flush({ id: 'c-1' });

      await expect(promesse).resolves.toEqual({ statut: 'enregistree', reference: 'c-1' });
    });

    it('n envoie que l identifiant et la quantité de chaque ligne', async () => {
      const promesse = store.envoyer(COMMANDE, UN_PANIER);

      const requete = http.expectOne('/api/commandes');
      expect((requete.request.body as { lignes: unknown[] }).lignes).toEqual([
        { produitId: 'p-001', quantite: 2 },
      ]);

      requete.flush({ id: 'c-1' });
      await promesse;
    });

    it('vide le panier après un succès', async () => {
      panier.ajouter(ETAGERE, 2);
      const promesse = store.envoyer(COMMANDE, panier.lignes());
      http.expectOne(() => true).flush({ id: 'c-1' });
      await promesse;

      expect(panier.estVide()).toBe(true);
    });

    it('expose la référence de la dernière commande', async () => {
      const promesse = store.envoyer(COMMANDE, UN_PANIER);
      http.expectOne(() => true).flush({ id: 'c-7' });
      await promesse;

      expect(store.reference()).toBe('c-7');
    });
  });

  describe('refus', () => {
    it('refuse un panier vide sans appeler l API', async () => {
      await expect(store.envoyer(COMMANDE, PANIER_VIDE)).resolves.toEqual({ statut: 'panier-vide' });

      http.expectNone(() => true);
    });

    it('traduit un 409 en stock insuffisant, avec le produit fautif', async () => {
      const promesse = store.envoyer(COMMANDE, UN_PANIER);
      http.expectOne(() => true).flush(
        { erreur: 'stock_insuffisant', produitId: 'p-001' },
        { status: 409, statusText: 'conflit' },
      );

      await expect(promesse).resolves.toEqual({ statut: 'stock-insuffisant', produitId: 'p-001' });
    });

    it('traduit un 401 en session expirée', async () => {
      const promesse = store.envoyer(COMMANDE, UN_PANIER);
      http.expectOne(() => true).flush('', { status: 401, statusText: 'non' });

      await expect(promesse).resolves.toEqual({ statut: 'non-authentifie' });
    });

    it('traduit toute autre erreur en indisponibilité', async () => {
      const promesse = store.envoyer(COMMANDE, UN_PANIER);
      http.expectOne(() => true).flush('', { status: 503, statusText: 'indispo' });

      await expect(promesse).resolves.toEqual({ statut: 'indisponible' });
    });

    it('ne vide surtout pas le panier en cas d échec', async () => {
      panier.ajouter(ETAGERE, 2);
      const promesse = store.envoyer(COMMANDE, panier.lignes());
      http.expectOne(() => true).flush('', { status: 503, statusText: 'indispo' });
      await promesse;

      expect(panier.estVide()).toBe(false);
    });
  });

  describe('état d envoi', () => {
    it('signale l envoi puis le termine', async () => {
      const promesse = store.envoyer(COMMANDE, UN_PANIER);

      expect(store.envoiEnCours()).toBe(true);

      http.expectOne(() => true).flush({ id: 'c-1' });
      await promesse;

      expect(store.envoiEnCours()).toBe(false);
    });

    it('termine l envoi même après une erreur', async () => {
      const promesse = store.envoyer(COMMANDE, UN_PANIER);
      http.expectOne(() => true).flush('', { status: 503, statusText: 'indispo' });
      await promesse;

      expect(store.envoiEnCours()).toBe(false);
    });
  });
});
