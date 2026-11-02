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
 */
export function schemaCommande(base: string) {
  return schema<Commande>((c) => {
    required(c.email, { message: 'Renseignez votre email' });
    email(c.email, { message: 'Cet email ne semble pas valide' });
    required(c.nom, { message: 'Renseignez votre nom' });
    required(c.adresse, { message: 'Renseignez votre adresse' });
    pattern(c.codePostal, FORMAT_CODE_POSTAL, { message: 'Cinq chiffres attendus' });
    required(c.ville, { message: 'Renseignez votre ville' });

    validate(c.accepteCgv, ({ value }) =>
      value() ? undefined : { kind: 'cgv', message: 'Vous devez accepter les CGV' },
    );

    /**
     * Validation asynchrone : la zone de livraison est vérifiée par l'API.
     * `request` renvoie `undefined` tant que le format n'est pas bon — inutile
     * d'interroger le serveur pour « 4 ».
     */
    validateHttp(c.codePostal, {
      request: ({ value }) =>
        FORMAT_CODE_POSTAL.test(value()) ? `${base}/validation/code-postal/${value()}` : undefined,
      onSuccess: (reponse: ReponseCodePostal) =>
        reponse.valide
          ? undefined
          : { kind: 'zone', message: 'Nous ne livrons pas encore dans cette zone' },
      onError: () => undefined,
    });
  });
}
