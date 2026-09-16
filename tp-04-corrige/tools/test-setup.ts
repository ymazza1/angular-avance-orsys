import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach } from 'vitest';

/**
 * Initialisation commune des tests de composants.
 *
 * Trois choses, chacune pour une raison précise :
 *
 * 1. `resetTestEnvironment` avant l'init : Vitest exécute ce fichier une fois
 *    par fichier de test, et sans ça le second échouerait avec
 *    « Cannot set base providers because it has already been called ».
 *
 * 2. `resetTestingModule` après chaque test : sans ce crochet, le second
 *    `configureTestingModule` d'un même fichier échoue avec
 *    « the test module has already been instantiated ».
 *
 * 3. La locale française est enregistrée pour que les pipes de formatage
 *    (currency, date, number) produisent en test ce qu'ils produiront en
 *    production.
 *
 * L'application est zoneless : les tests attendent explicitement la
 * stabilisation (`await fixture.whenStable()`) au lieu d'appeler
 * `fixture.detectChanges()`.
 */
registerLocaleData(localeFr);

const banc = getTestBed();
banc.resetTestEnvironment();
banc.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

afterEach(() => banc.resetTestingModule());
