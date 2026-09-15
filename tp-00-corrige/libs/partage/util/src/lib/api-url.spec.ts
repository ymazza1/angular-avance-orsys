import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { API_URL } from './api-url';

describe('API_URL', () => {
  it('est renseigné', () => {
    TestBed.configureTestingModule({});

    expect(TestBed.inject(API_URL)).not.toBe('');
  });

  it('est une URL absolue', () => {
    TestBed.configureTestingModule({});

    expect(TestBed.inject(API_URL)).toMatch(/^https?:\/\//);
  });

  it('pointe vers la base /api, sans barre oblique finale', () => {
    TestBed.configureTestingModule({});

    expect(TestBed.inject(API_URL)).toMatch(/\/api$/);
  });

  it('peut être remplacé en test', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: API_URL, useValue: '/faux-api' }],
    });

    expect(TestBed.inject(API_URL)).toBe('/faux-api');
  });
});
