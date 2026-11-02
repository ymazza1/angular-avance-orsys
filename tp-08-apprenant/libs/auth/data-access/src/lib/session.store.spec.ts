import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@maison/partage/util';
import { beforeEach, describe, expect, it } from 'vitest';
import { SessionStore } from './session.store';

const REPONSE_ADMIN = {
  jeton: 'j-admin',
  rafraichissement: 'r-admin',
  role: 'admin',
  nom: 'Yanis Berger',
  expireDans: 30,
};

describe('SessionStore', () => {
  let http: HttpTestingController;
  let store: SessionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
  });

  it('démarre déconnecté', () => {
    expect(store.estConnecte()).toBe(false);
    expect(store.estAdmin()).toBe(false);
    expect(store.jetonValide()).toBeNull();
  });

  it('ouvre une session à la connexion', async () => {
    const promesse = store.connexion('admin@maison.co', 'admin');
    http.expectOne('/api/auth/connexion').flush(REPONSE_ADMIN);

    await expect(promesse).resolves.toBe(true);
    expect(store.estConnecte()).toBe(true);
    expect(store.estAdmin()).toBe(true);
    expect(store.nom()).toBe('Yanis Berger');
  });

  it('signale des identifiants refusés sans rejeter', async () => {
    const promesse = store.connexion('inconnu@maison.co', 'x');
    http.expectOne('/api/auth/connexion').flush('', { status: 401, statusText: 'non' });

    await expect(promesse).resolves.toBe(false);
    expect(store.erreur()).toBe('identifiants_invalides');
    expect(store.estConnecte()).toBe(false);
  });

  it('expose un jeton utilisable', async () => {
    const promesse = store.connexion('admin@maison.co', 'admin');
    http.expectOne(() => true).flush(REPONSE_ADMIN);
    await promesse;

    expect(store.jetonValide()).toBe('j-admin');
  });

  it('ne rend pas un jeton expiré', async () => {
    const promesse = store.connexion('admin@maison.co', 'admin');
    http.expectOne(() => true).flush({ ...REPONSE_ADMIN, expireDans: 0 });
    await promesse;

    expect(store.jetonValide()).toBeNull();
  });

  it('remplace la session au rafraîchissement', async () => {
    const connexion = store.connexion('admin@maison.co', 'admin');
    http.expectOne(() => true).flush(REPONSE_ADMIN);
    await connexion;

    const rafraichissement = store.rafraichir();
    http.expectOne('/api/auth/refresh').flush({ ...REPONSE_ADMIN, jeton: 'j-2' });
    await rafraichissement;

    expect(store.jetonValide()).toBe('j-2');
  });

  it('déconnecte quand le rafraîchissement échoue', async () => {
    const connexion = store.connexion('admin@maison.co', 'admin');
    http.expectOne(() => true).flush(REPONSE_ADMIN);
    await connexion;

    const rafraichissement = store.rafraichir();
    http.expectOne('/api/auth/refresh').flush('', { status: 401, statusText: 'non' });

    await expect(rafraichissement).resolves.toBe(false);
    expect(store.estConnecte()).toBe(false);
  });

  it('ne rafraîchit pas sans session', async () => {
    await expect(store.rafraichir()).resolves.toBe(false);

    http.expectNone(() => true);
  });

  it('oublie tout à la déconnexion', async () => {
    const connexion = store.connexion('admin@maison.co', 'admin');
    http.expectOne(() => true).flush(REPONSE_ADMIN);
    await connexion;

    store.deconnexion();

    expect(store.estConnecte()).toBe(false);
    expect(store.jetonValide()).toBeNull();
  });
});
