import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'mc-racine',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header>
      <a routerLink="/">Maison&amp;Co</a>
    </header>

    <main>
      <router-outlet />
    </main>
  `,
})
export class App {}
