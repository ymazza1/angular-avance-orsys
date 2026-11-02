import {
  email,
  pattern,
  required,
  schema,
  validate,
  validateHttp,
} from '@angular/forms/signals';
import { Commande, FORMAT_CODE_POSTAL } from '@maison/commande/domaine';

interface ReponseCodePostal {
  valide: boolean;
  ville?: string;
}

/**
 * Règles de validation du tunnel de commande.
 *
 * Extrait du composant à dessein : un schéma se teste sans monter d'interface,
 * sans DOM et sans clic. C'est l'apport principal des Signal Forms par rapport
 * aux Reactive Forms, où la validation finit mêlée à la construction du
 * FormGroup.
 *
 * `base` est passée en paramètre plutôt qu'injectée : le schéma reste une
 * fonction pure de configuration.
 *
 * TODO TP 6 — étapes 2 et 3
 * Les tests de commande.schema.spec.ts décrivent chaque règle attendue, et les
 * messages exacts. Opérateurs utiles : required, email, pattern, validate,
 * validateHttp.
 */
export function schemaCommande(base: string) {
  return schema<Commande>((c) => {
    throw new Error('TP 6 — schemaCommande reste à écrire');
  });
}
