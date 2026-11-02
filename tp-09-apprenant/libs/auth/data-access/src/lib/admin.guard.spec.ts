import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, runInInjectionContext, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Route, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { API_URL } from '@maison/partage/util';
import { beforeEach, describe, expect, it } from 'vitest';
import { estAdmin } from './admin.guard';
import { SessionStore } from './session.store';

const ROUTE: Route = { path: 'admin' };

function reponse(role: string) {
  return { jeton: 'j', rafraichissement: 'r', role, nom: 'X', expireDans: 30 };
}

describe('estAdmin (CanMatchFn)', () => {
  let http: HttpTestingController;
  let session: SessionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
  });

  const executer = () =>
    runInInjectionContext(TestBed.inject(Injector), () => estAdmin(ROUTE, []));

  async function seConnecterEn(role: string): Promise<void> {
    const promesse = session.connexion('x@maison.co', 'x');
    http.expectOne(() => true).flush(reponse(role));
    await promesse;
  }

  it('refuse un visiteur anonyme', () => {
    expect(executer()).toBeInstanceOf(UrlTree);
  });

  it('refuse un client connecté', async () => {
    await seConnecterEn('client');

    expect(executer()).toBeInstanceOf(UrlTree);
  });

  it('redirige vers la connexion', () => {
    expect(String(executer())).toContain('/connexion');
  });

  it('accepte un administrateur', async () => {
    await seConnecterEn('admin');

    expect(executer()).toBe(true);
  });

  it('refuse à nouveau après déconnexion', async () => {
    await seConnecterEn('admin');
    session.deconnexion();

    expect(executer()).toBeInstanceOf(UrlTree);
  });
});
