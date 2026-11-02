import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@maison/partage/util';
import { beforeEach, describe, expect, it } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { SessionStore } from './session.store';

const REPONSE = {
  jeton: 'j-1',
  rafraichissement: 'r-1',
  role: 'client',
  nom: 'Camille',
  expireDans: 30,
};

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let session: SessionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    session = TestBed.inject(SessionStore);
  });

  async function seConnecter(): Promise<void> {
    const promesse = session.connexion('camille@maison.co', 'client');
    http.expectOne('/api/auth/connexion').flush(REPONSE);
    await promesse;
  }

  it('n ajoute rien quand personne n est connecté', () => {
    client.get('/api/produits').subscribe();

    expect(http.expectOne('/api/produits').request.headers.has('Authorization')).toBe(false);
  });

  it('ajoute le jeton une fois connecté', async () => {
    await seConnecter();

    client.get('/api/produits').subscribe();

    expect(http.expectOne('/api/produits').request.headers.get('Authorization')).toBe('Bearer j-1');
  });

  it('épargne la route de connexion', () => {
    client.post('/api/auth/connexion', {}).subscribe();

    expect(http.expectOne('/api/auth/connexion').request.headers.has('Authorization')).toBe(false);
  });

  it('épargne la route de rafraîchissement', async () => {
    await seConnecter();

    client.post('/api/auth/refresh', {}).subscribe();

    expect(http.expectOne('/api/auth/refresh').request.headers.has('Authorization')).toBe(false);
  });

  it('n envoie jamais le jeton vers un autre domaine', async () => {
    await seConnecter();

    client.get('https://analytics.example.com/evenement').subscribe();

    const requete = http.expectOne('https://analytics.example.com/evenement');
    expect(requete.request.headers.has('Authorization')).toBe(false);
  });

  it('cesse d ajouter le jeton après déconnexion', async () => {
    await seConnecter();
    session.deconnexion();

    client.get('/api/produits').subscribe();

    expect(http.expectOne('/api/produits').request.headers.has('Authorization')).toBe(false);
  });
});
