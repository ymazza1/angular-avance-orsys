import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SessionStore } from '@maison/auth/data-access';

/**
 * Barre de connexion de démonstration.
 *
 * Elle n'est pas le sujet du TP : elle existe pour qu'on puisse déclencher
 * `connexion()` depuis le navigateur et observer l'onglet Réseau. Pas de
 * FormsModule — deux signals et des événements `input` suffisent, et ça évite
 * d'alourdir le bundle initial qu'on mesure au TP 10.
 */
@Component({
  selector: 'mc-racine',
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <a routerLink="/">Maison&amp;Co</a>

      @if (session.estConnecte()) {
        <span>
          {{ session.nom() }}
          @if (session.estAdmin()) {
            — <a routerLink="/admin">back-office</a>
          }
        </span>
        <button type="button" (click)="session.deconnexion()">Déconnexion</button>
      } @else {
        <form (submit)="connecter($event)">
          <input
            type="email"
            placeholder="email"
            autocomplete="username"
            [value]="email()"
            (input)="email.set($any($event.target).value)"
          />
          <input
            type="password"
            placeholder="mot de passe"
            autocomplete="current-password"
            [value]="motDePasse()"
            (input)="motDePasse.set($any($event.target).value)"
          />
          <button type="submit" [disabled]="enCours()">Connexion</button>
        </form>
        @if (session.erreur(); as erreur) {
          <span role="alert">{{ erreur }}</span>
        }
      }
    </header>

    <main>
      <router-outlet />
    </main>
  `,
})
export class App {
  protected readonly session = inject(SessionStore);

  protected readonly email = signal('');
  protected readonly motDePasse = signal('');
  protected readonly enCours = signal(false);

  protected async connecter(evenement: Event): Promise<void> {
    evenement.preventDefault();
    this.enCours.set(true);
    try {
      // `connexion` renvoie un booléen et ne rejette jamais : l'échec
      // d'identifiants est lisible dans `session.erreur()`.
      if (await this.session.connexion(this.email(), this.motDePasse())) {
        this.motDePasse.set('');
      }
    } finally {
      this.enCours.set(false);
    }
  }
}
