/**
 * API de démonstration Maison&Co.
 *
 * Conçue pour les TP de la formation : elle expose délibérément des cas
 * pénibles (latence, erreurs intermittentes, jeton à durée très courte)
 * afin que les TP aient quelque chose de réel à traiter.
 *
 *   npm install && npm start        → http://localhost:3333
 *
 * Modes prédéfinis :
 *   node server.js --instable       30 % d'erreurs, 600 ms de latence   (TP 3)
 *   node server.js --jeton-court    jeton valable 10 secondes           (TP 8)
 *
 * Réglages à la carte (options de ligne de commande, ou variables
 * d'environnement du même nom pour ceux qui préfèrent) :
 *   --port=3333          port d'écoute
 *   --latence=250        latence artificielle en ms (0 pour désactiver)
 *   --taux-erreur=0      probabilité d'une 503 sur /api/produits (0 à 1)
 *   --duree-jeton=30     durée de vie du jeton d'accès en secondes
 *
 * Les options sont passées en ligne de commande plutôt que par `VAR=valeur`
 * en préfixe : cette syntaxe-là est propre aux shells Unix et échoue sur
 * l'invite de commandes Windows.
 */
const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const { PRODUITS, PIECES, MATIERES } = require('./data/produits');

/** Lit --option=valeur, puis la variable d'environnement, puis le défaut. */
function option(nom, variableEnv, defaut) {
  const prefixe = `--${nom}=`;
  const argument = process.argv.find((a) => a.startsWith(prefixe));
  if (argument) return Number(argument.slice(prefixe.length));
  if (process.env[variableEnv] !== undefined) return Number(process.env[variableEnv]);
  return defaut;
}

const drapeau = (nom) => process.argv.includes(`--${nom}`);

const PORT = option('port', 'PORT', 3333);
const LATENCE = option('latence', 'LATENCE', drapeau('instable') ? 600 : 250);
const TAUX_ERREUR = option('taux-erreur', 'TAUX_ERREUR', drapeau('instable') ? 0.3 : 0);
const DUREE_JETON = option('duree-jeton', 'DUREE_JETON', drapeau('jeton-court') ? 10 : 30);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// --- utilitaires ------------------------------------------------------------

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

app.use(async (_req, _res, next) => {
  if (LATENCE > 0) await attendre(LATENCE);
  next();
});

const sansAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const prixEffectif = (p) => (p.promotion ? Math.round(p.prix_ttc * (1 - p.promotion / 100) * 100) / 100 : p.prix_ttc);

// --- catalogue --------------------------------------------------------------

/**
 * GET /api/produits
 * Paramètres : q, piece, matiere, prixMax, tri (pertinence|prix|prix-desc|note),
 *              page (1-based), taille
 * Réponse : { items, total, page, taille, facettes }
 */
app.get('/api/produits', (req, res) => {
  if (TAUX_ERREUR > 0 && Math.random() < TAUX_ERREUR) {
    return res.status(503).json({ erreur: 'catalogue_indisponible' });
  }

  const { q, piece, matiere, prixMax, tri = 'pertinence' } = req.query;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const taille = Math.min(50, Math.max(1, Number(req.query.taille ?? 12)));

  let items = PRODUITS.slice();

  if (q) {
    const terme = sansAccents(String(q));
    items = items.filter((p) => sansAccents(p.nom).includes(terme) || sansAccents(p.description).includes(terme));
  }
  if (piece) items = items.filter((p) => p.piece === piece);
  if (matiere) items = items.filter((p) => p.matiere === matiere);
  if (prixMax) items = items.filter((p) => prixEffectif(p) <= Number(prixMax));

  const tris = {
    prix: (a, b) => prixEffectif(a) - prixEffectif(b),
    'prix-desc': (a, b) => prixEffectif(b) - prixEffectif(a),
    note: (a, b) => b.note - a.note,
    pertinence: (a, b) => b.nb_avis - a.nb_avis,
  };
  items.sort(tris[tri] ?? tris.pertinence);

  const total = items.length;
  const debut = (page - 1) * taille;

  res.json({
    items: items.slice(debut, debut + taille),
    total,
    page,
    taille,
    facettes: {
      pieces: PIECES.map((v) => ({ valeur: v, nb: items.filter((p) => p.piece === v).length })),
      matieres: MATIERES.map((v) => ({ valeur: v, nb: items.filter((p) => p.matiere === v).length })),
    },
  });
});

app.get('/api/produits/:id', (req, res) => {
  const produit = PRODUITS.find((p) => p.id === req.params.id);
  if (!produit) return res.status(404).json({ erreur: 'produit_introuvable' });
  res.json(produit);
});

/** Endpoint lent volontairement : sert aux TP sur @defer et les squelettes. */
app.get('/api/produits/:id/avis', async (req, res) => {
  await attendre(1200);
  const produit = PRODUITS.find((p) => p.id === req.params.id);
  if (!produit) return res.status(404).json({ erreur: 'produit_introuvable' });
  res.json(
    Array.from({ length: 5 }, (_, i) => ({
      id: `${produit.id}-a${i}`,
      auteur: ['Camille', 'Yanis', 'Sofia', 'Marc', 'Lena'][i],
      note: Math.max(1, Math.round(produit.note) - (i % 2)),
      texte: 'Conforme à la description, montage sans difficulté.',
    })),
  );
});

app.get('/api/stocks/:id', (req, res) => {
  const produit = PRODUITS.find((p) => p.id === req.params.id);
  if (!produit) return res.status(404).json({ erreur: 'produit_introuvable' });
  res.json({ id: produit.id, disponible: produit.stock > 0, quantite: produit.stock });
});

// --- authentification -------------------------------------------------------

const COMPTES = [
  { email: 'client@maison.co', motDePasse: 'client', role: 'client', nom: 'Camille Roux' },
  { email: 'admin@maison.co', motDePasse: 'admin', role: 'admin', nom: 'Yanis Berger' },
];

/** Jetons en mémoire : suffisant pour une formation, inacceptable en production. */
const sessions = new Map();

function ouvrirSession(compte) {
  const jeton = crypto.randomUUID();
  const rafraichissement = crypto.randomUUID();
  sessions.set(jeton, { compte, expireLe: Date.now() + DUREE_JETON * 1000, rafraichissement });
  return { jeton, rafraichissement, expireDans: DUREE_JETON, role: compte.role, nom: compte.nom };
}

app.post('/api/auth/connexion', (req, res) => {
  const { email, motDePasse } = req.body ?? {};
  const compte = COMPTES.find((c) => c.email === email && c.motDePasse === motDePasse);
  if (!compte) return res.status(401).json({ erreur: 'identifiants_invalides' });
  res.json(ouvrirSession(compte));
});

app.post('/api/auth/refresh', (req, res) => {
  const { rafraichissement } = req.body ?? {};
  const entree = [...sessions.entries()].find(([, s]) => s.rafraichissement === rafraichissement);
  if (!entree) return res.status(401).json({ erreur: 'rafraichissement_invalide' });
  sessions.delete(entree[0]);
  res.json(ouvrirSession(entree[1].compte));
});

app.post('/api/auth/deconnexion', (req, res) => {
  const jeton = (req.headers.authorization ?? '').replace('Bearer ', '');
  sessions.delete(jeton);
  res.status(204).end();
});

function authentifier(req, res, next) {
  const jeton = (req.headers.authorization ?? '').replace('Bearer ', '');
  const session = sessions.get(jeton);
  if (!session) return res.status(401).json({ erreur: 'jeton_absent_ou_inconnu' });
  if (session.expireLe < Date.now()) return res.status(401).json({ erreur: 'jeton_expire' });
  req.compte = session.compte;
  next();
}

function exigerRole(role) {
  return (req, res, next) =>
    req.compte?.role === role ? next() : res.status(403).json({ erreur: 'acces_refuse' });
}

app.get('/api/moi', authentifier, (req, res) => res.json(req.compte));

// --- back-office ------------------------------------------------------------

app.get('/api/admin/statistiques', authentifier, exigerRole('admin'), (_req, res) => {
  res.json({
    chiffreAffaires: 184320,
    commandes: 412,
    panierMoyen: 447.4,
    ruptures: PRODUITS.filter((p) => p.stock === 0).map((p) => ({ id: p.id, nom: p.nom })),
    ventesParPiece: PIECES.map((piece) => ({
      piece,
      montant: PRODUITS.filter((p) => p.piece === piece).reduce((t, p) => t + p.prix_ttc, 0),
    })),
  });
});

app.patch('/api/admin/produits/:id', authentifier, exigerRole('admin'), (req, res) => {
  const produit = PRODUITS.find((p) => p.id === req.params.id);
  if (!produit) return res.status(404).json({ erreur: 'produit_introuvable' });
  Object.assign(produit, req.body ?? {});
  res.json(produit);
});

// --- commande ---------------------------------------------------------------

const VILLES = {
  44000: 'Nantes', 44200: 'Nantes', 44300: 'Nantes', 44400: 'Rezé',
  75001: 'Paris', 69001: 'Lyon', 33000: 'Bordeaux', 59000: 'Lille',
  44118: 'La Chevrolière', 44840: 'Les Sorinières',
};

/** Validation asynchrone utilisée par le TP sur les formulaires. */
app.get('/api/validation/code-postal/:cp', (req, res) => {
  const ville = VILLES[req.params.cp];
  res.json(ville ? { valide: true, ville } : { valide: false, motif: 'zone_non_desservie' });
});

const CODES_PROMO = { BIENVENUE10: 10, MEUBLE20: 20 };

app.get('/api/promotions/:code', (req, res) => {
  const remise = CODES_PROMO[req.params.code?.toUpperCase()];
  res.json(remise ? { valide: true, remisePourcent: remise } : { valide: false });
});

const commandes = [];

app.post('/api/commandes', authentifier, (req, res) => {
  const { lignes } = req.body ?? {};
  if (!Array.isArray(lignes) || lignes.length === 0) {
    return res.status(422).json({ erreur: 'panier_vide' });
  }
  const indisponible = lignes.find((l) => {
    const produit = PRODUITS.find((p) => p.id === l.produitId);
    return !produit || produit.stock < l.quantite;
  });
  if (indisponible) {
    return res.status(409).json({ erreur: 'stock_insuffisant', produitId: indisponible.produitId });
  }
  const commande = { id: `c-${commandes.length + 1}`, ...req.body, creeeLe: new Date().toISOString() };
  commandes.push(commande);
  res.status(201).json(commande);
});

// --- divers -----------------------------------------------------------------

app.get('/api/sante', (_req, res) =>
  res.json({ statut: 'ok', produits: PRODUITS.length, latence: LATENCE, tauxErreur: TAUX_ERREUR }),
);

app.use((_req, res) => res.status(404).json({ erreur: 'route_inconnue' }));

app.listen(PORT, () => {
  console.log(`API Maison&Co  →  http://localhost:${PORT}/api/sante`);
  console.log(`latence ${LATENCE} ms · taux d'erreur ${TAUX_ERREUR} · jeton ${DUREE_JETON} s`);
  console.log('comptes : client@maison.co / client   —   admin@maison.co / admin');
});
