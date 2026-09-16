import { TestBed } from '@angular/core/testing';
import { LivraisonStandard, LivraisonVolumineux, StrategieLivraison } from '@maison/livraison/domaine';
import { describe, expect, it } from 'vitest';
import { fournirStrategiesLivraison, STRATEGIES_LIVRAISON } from './strategies.providers';

describe('STRATEGIES_LIVRAISON', () => {
  it('injecte toutes les stratégies sous forme de tableau', () => {
    TestBed.configureTestingModule({ providers: [fournirStrategiesLivraison()] });

    const strategies = TestBed.inject<readonly StrategieLivraison[]>(STRATEGIES_LIVRAISON);

    expect(strategies).toHaveLength(2);
  });

  it('place le cas général en dernier', () => {
    TestBed.configureTestingModule({ providers: [fournirStrategiesLivraison()] });

    const strategies = TestBed.inject<readonly StrategieLivraison[]>(STRATEGIES_LIVRAISON);

    expect(strategies[0]).toBeInstanceOf(LivraisonVolumineux);
    expect(strategies[1]).toBeInstanceOf(LivraisonStandard);
  });

  it('expose des stratégies conformes au contrat du domaine', () => {
    TestBed.configureTestingModule({ providers: [fournirStrategiesLivraison()] });

    const strategies = TestBed.inject<readonly StrategieLivraison[]>(STRATEGIES_LIVRAISON);

    expect(strategies.map((s) => s.nom)).toEqual(['volumineux', 'standard']);
  });
});
