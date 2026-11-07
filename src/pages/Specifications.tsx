import { useState } from 'react';
import {
  FileText, Printer, Download, ChevronDown, ChevronRight,
  Building2, Users, Trophy, Flag, Bike, ClipboardList, BarChart3,
  CalendarDays, Bell, Settings, ShieldCheck, Mountain, Tag, Medal,
  Check, Monitor, Database, Lock, Smartphone, Layers,
} from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: typeof FileText;
  content: React.ReactNode;
}

const TABLE_OF_CONTENTS = [
  { num: '1', title: 'Présentation du projet', page: '3' },
  { num: '2', title: 'Objectifs et portée', page: '4' },
  { num: '3', title: 'Acteurs et rôles', page: '5' },
  { num: '4', title: 'Architecture technique', page: '6' },
  { num: '5', title: 'Modules fonctionnels', page: '7' },
  { num: '5.1', title: 'Tableau de bord & statistiques', page: '7' },
  { num: '5.2', title: 'Gestion des compétitions', page: '8' },
  { num: '5.3', title: 'Gestion des participants', page: '9' },
  { num: '5.4', title: 'Inscriptions & délais', page: '10' },
  { num: '5.5', title: 'Résultats & classements', page: '11' },
  { num: '5.6', title: 'Équipe nationale', page: '12' },
  { num: '5.7', title: 'Documents des associations', page: '12' },
  { num: '5.8', title: 'Notifications & calendrier', page: '13' },
  { num: '5.9', title: 'Administration', page: '13' },
  { num: '6', title: 'Exigences non fonctionnelles', page: '14' },
  { num: '7', title: 'Sécurité & confidentialité', page: '15' },
  { num: '8', title: 'Livraisons & planning', page: '16' },
];

const FEATURES = [
  { icon: BarChart3, label: 'Tableau de bord', desc: 'Vue d\'ensemble des statistiques et KPIs' },
  { icon: CalendarDays, label: 'Calendrier', desc: 'Planning des compétitions et manches' },
  { icon: Trophy, label: 'Championnats & Coupes', desc: 'Gestion des saisons et compétitions' },
  { icon: Flag, label: 'Manches & Courses', desc: 'Organisation des épreuves par catégorie' },
  { icon: Users, label: 'Coureurs & Clubs', desc: 'Gestion des licenciés et associations' },
  { icon: ClipboardList, label: 'Inscriptions', desc: 'Inscriptions en ligne avec délais' },
  { icon: Medal, label: 'Résultats & Classements', desc: 'Saisie des résultats et calcul des points' },
  { icon: ShieldCheck, label: 'Équipe nationale', desc: 'Athlètes, passeports et documents' },
  { icon: Bell, label: 'Notifications', desc: 'Alertes en temps réel' },
  { icon: Settings, label: 'Administration', desc: 'Gestion des comptes et paramètres' },
];

const MODULES = [
  {
    icon: BarChart3,
    title: 'Tableau de bord & statistiques',
    items: [
      'Indicateurs clés : nombre de coureurs, clubs, courses, inscriptions en attente',
      'Graphiques de répartition par discipline, catégorie et région',
      'Évolution des participations au cours de la saison',
      'Vue par discipline dédiée (Route, VTT)',
      'Statistiques détaillées accessibles à tous les utilisateurs authentifiés',
    ],
  },
  {
    icon: Trophy,
    title: 'Gestion des compétitions',
    items: [
      'Championnats : compétitions sur une saison avec date de début et de fin, statut (brouillon, actif, terminé)',
      'Coupes : compétitions multi-manches sans notion de dates de saison',
      'Manches : rattachées à un championnat ou une coupe, avec date, heure, lieu, distance, type (Route, CLM, VTT, Cyclo-cross, Piste)',
      'Courses : une course par catégorie au sein d\'une manche, avec dossard de départ, photo du circuit, affiche et itinéraire Google Maps',
      'Délai d\'inscription configurable par course avec date et heure limite',
    ],
  },
  {
    icon: Users,
    title: 'Gestion des participants',
    items: [
      'Clubs : annuaire complet (nom, logo, responsable, adresse, téléphone, email, ville, pays)',
      'Coureurs : profil détaillé (photo, sexe, date de naissance, catégorie, licence, club, nationalité, dossard)',
      'Catégories : référence partagée (Elite Homme, Elite Femme, U23, Junior, Cadet, Master)',
      'Recherche et filtrage par club, catégorie ou nom',
      'Génération de QR code pour chaque coureur',
    ],
  },
  {
    icon: ClipboardList,
    title: 'Inscriptions & délais d\'inscription',
    items: [
      'Les associations inscrivent leurs coureurs aux courses depuis leur espace',
      'Sélection multiple de coureurs éligibles par catégorie',
      'L\'administrateur valide ou refuse chaque inscription',
      'Attribution automatique des numéros de dossard à la validation',
      'Délai d\'inscription par course : après la date limite, les nouvelles inscriptions sont bloquées',
      'Affichage visuel du délai (badge) sur chaque course et dans la liste des inscriptions',
    ],
  },
  {
    icon: Medal,
    title: 'Résultats & classements',
    items: [
      'Saisie des résultats par course : position, temps, écart, statut (terminé, DNF, DNS, DSQ)',
      'Calcul automatique des points selon un barème configurable',
      'Barème des points : échelle personnalisable par position (1er, 2e, 3e…)',
      'Classements généraux par catégorie et par discipline',
      'Consultation publique des résultats et classements',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Équipe nationale',
    items: [
      'Gestion des athlètes de l\'équipe nationale par l\'administrateur',
      'Regroupement par catégorie (Elite, U23, Junior, etc.)',
      'Téléversement du passeport / visa de chaque athlète',
      'Téléversement de documents complémentaires (certificat médical, licence, etc.)',
      'Consultation par tous les utilisateurs authentifiés (lecture seule)',
      'Filtre par catégorie avec comptage des athlètes',
    ],
  },
  {
    icon: Building2,
    title: 'Documents des associations',
    items: [
      'Chaque association téléverse son document d\'inscription annuelle (par saison)',
      'Un document par club et par saison (remplacement possible)',
      'L\'administrateur FTC reçoit et examine chaque soumission',
      'Approbation ou rejet avec note explicative',
      'Suivi du statut : en attente, approuvé, rejeté',
      'Téléchargement des documents par l\'administrateur',
    ],
  },
  {
    icon: Bell,
    title: 'Notifications & calendrier',
    items: [
      'Notifications en temps réel (info, compétition, inscription, résultats, alerte)',
      'Notifications globales diffusées à tous les utilisateurs',
      'Marquage des notifications comme lues',
      'Calendrier des compétitions avec navigation par mois',
      'Vue consolidée de toutes les manches et courses à venir',
    ],
  },
  {
    icon: Settings,
    title: 'Administration',
    items: [
      'Création de comptes association (email, mot de passe, nom du club)',
      'Activation / désactivation des comptes (bannissement côté authentification)',
      'Gestion des barèmes de points',
      'Paramètres généraux de la fédération',
      'Gestion des utilisateurs via edge function sécurisée',
    ],
  },
];

const ROLES = [
  { role: 'Super Administrateur', color: 'bg-primary-600', perms: 'Tous les droits : gestion des comptes, compétitions, équipe nationale, paramètres' },
  { role: 'Administrateur', color: 'bg-primary-500', perms: 'Gestion des compétitions, inscriptions, résultats, équipe nationale, associations' },
  { role: 'Organisateur', color: 'bg-accent-500', perms: 'Création et gestion de compétitions, manches et courses' },
  { role: 'Commissaire', color: 'bg-success-500', perms: 'Saisie et validation des résultats, consultation des courses' },
  { role: 'Association / Club', color: 'bg-warning-500', perms: 'Inscription de ses coureurs, téléversement du document annuel, consultation' },
  { role: 'Coureur', color: 'bg-gray-400', perms: 'Consultation seule des compétitions, classements et calendrier' },
];

export default function Specifications() {
  const [expanded, setExpanded] = useState<string | null>('intro');

  const toggle = (id: string) => setExpanded(expanded === id ? null : id);

  return (
    <div className="spec-doc">
      {/* Screen-only toolbar */}
      <div className="spec-toolbar no-print">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 grid place-items-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Cahier des charges</h1>
            <p className="text-sm text-gray-500">FTC Manager — Fédération Tunisienne de Cyclisme</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => window.print()} className="btn-primary">
              <Printer className="w-4 h-4" /> Imprimer / PDF
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500 dark:text-slate-400 mb-6 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Cliquez sur « Imprimer / PDF » puis choisissez « Enregistrer au format PDF » comme destination.
        </div>
      </div>

      {/* === PAGE 1: Cover === */}
      <div className="spec-page spec-cover">
        <div className="flex flex-col items-center justify-center min-h-[25cm] py-16">
          <img src="/images/Federation_tunisienne_de_cyclisme_logo.png" alt="FTC" className="w-28 h-28 object-contain mb-8" />
          <div className="text-sm font-medium tracking-[0.3em] uppercase text-primary-600 mb-4">Cahier des charges</div>
          <h1 className="text-4xl font-extrabold text-center mb-3 text-gray-900">
            FTC Manager
          </h1>
          <p className="text-lg text-gray-600 text-center max-w-md mb-8">
            Plateforme de gestion des compétitions de cyclisme
          </p>
          <div className="text-sm text-gray-500 text-center">
            <p className="font-medium">Fédération Tunisienne de Cyclisme</p>
            <p className="mt-1">Version 1.0 — Novembre 2026</p>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div className="spec-stat">
              <div className="text-3xl font-bold text-primary-600">10+</div>
              <div className="text-xs text-gray-500 mt-1">Modules</div>
            </div>
            <div className="spec-stat">
              <div className="text-3xl font-bold text-primary-600">6</div>
              <div className="text-xs text-gray-500 mt-1">Rôles</div>
            </div>
            <div className="spec-stat">
              <div className="text-3xl font-bold text-primary-600">5</div>
              <div className="text-xs text-gray-500 mt-1">Disciplines</div>
            </div>
          </div>
        </div>
      </div>

      {/* === PAGE 2: Table of contents === */}
      <div className="spec-page">
        <h2 className="spec-h2">Sommaire</h2>
        <div className="mt-6 space-y-1">
          {TABLE_OF_CONTENTS.map((item) => (
            <div key={item.num} className="flex items-baseline gap-3 py-1.5 border-b border-dotted border-gray-200">
              <span className={`font-mono text-sm font-semibold text-primary-600 w-10 ${item.num.includes('.') ? 'ml-4' : ''}`}>{item.num}</span>
              <span className={`flex-1 ${item.num.includes('.') ? 'text-sm text-gray-600' : 'font-medium text-gray-900'}`}>{item.title}</span>
              <span className="text-xs text-gray-400">{item.page}</span>
            </div>
          ))}
        </div>
      </div>

      {/* === Section 1: Présentation === */}
      <div className="spec-page">
        <div className="spec-section-num">1</div>
        <h2 className="spec-h2">Présentation du projet</h2>

        <div className="mt-6">
          <button onClick={() => toggle('intro')} className="spec-collapse-btn no-print">
            {expanded === 'intro' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Contexte et justification
          </button>
          <div className={`spec-content ${expanded === 'intro' ? 'spec-expanded' : 'spec-collapsed no-print'}`}>
            <p className="spec-p">
              La Fédération Tunisienne de Cyclisme (FTC) supervise l'ensemble des compétitions
              de cyclisme en Tunisie, regroupant plusieurs disciplines (Route, Contre-la-montre,
              VTT, Cyclo-cross, Piste) et de nombreuses catégories d'âge et de niveau. La gestion
              manuelle des inscriptions, des résultats et du suivi des athlètes représente une
              charge administrative importante et source d'erreurs.
            </p>
            <p className="spec-p">
              Le projet <strong>FTC Manager</strong> consiste à développer une plateforme web
              centralisée permettant à la fédération, aux associations et aux coureurs de gérer
              l'intégralité du cycle de vie d'une compétition de cyclisme — de la création des
              championnats à la publication des classements finaux — dans un environnement
              sécurisé, multi-utilisateurs et accessible depuis tout navigateur.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <button onClick={() => toggle('scope')} className="spec-collapse-btn no-print">
            {expanded === 'scope' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Périmètre fonctionnel
          </button>
          <div className={`spec-content ${expanded === 'scope' ? 'spec-expanded' : 'spec-collapsed no-print'}`}>
            <p className="spec-p">
              La plateforme couvre les domaines suivants :
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {FEATURES.map((f) => (
                <div key={f.label} className="spec-feature-card">
                  <div className="spec-feature-icon">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{f.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* === Section 2: Objectifs === */}
      <div className="spec-page">
        <div className="spec-section-num">2</div>
        <h2 className="spec-h2">Objectifs et portée</h2>

        <h3 className="spec-h3">Objectifs principaux</h3>
        <ul className="spec-ul">
          <li><strong>Centralisation</strong> : rassembler dans un seul outil la gestion des compétitions, des coureurs, des clubs et des résultats, au lieu de fichiers dispersés.</li>
          <li><strong>Automatisation</strong> : calcul automatique des points selon un barème configurable, attribution automatique des dossards, classements mis à jour en temps réel.</li>
          <li><strong>Digitalisation des inscriptions</strong> : permettre aux associations d'inscrire leurs coureurs en ligne, avec délai d'inscription configurable par course, supprimant le papier et les saisies manuelles.</li>
          <li><strong>Suivi documentaire</strong> : gestion des passeports des athlètes de l'équipe nationale et des documents d'inscription annuelle des associations, avec validation par l'administration.</li>
          <li><strong>Transparence</strong> : publication des résultats et classements accessible à tous les acteurs, notifications en temps réel.</li>
          <li><strong>Accessibilité</strong> : application web responsive accessible depuis ordinateur, tablette et mobile, sans installation.</li>
        </ul>

        <h3 className="spec-h3">Hors périmètre</h3>
        <ul className="spec-ul">
          <li>Gestion financière (cotisations, prix en argent)</li>
          <li>Billetterie et gestion de spectateurs</li>
          <li>Suivi GPS en direct des coureurs pendant la course</li>
          <li>Application mobile native (le responsive web couvre le mobile)</li>
        </ul>
      </div>

      {/* === Section 3: Acteurs === */}
      <div className="spec-page">
        <div className="spec-section-num">3</div>
        <h2 className="spec-h2">Acteurs et rôles</h2>
        <p className="spec-p">
          La plateforme définit six rôles avec des permissions différenciées. Chaque utilisateur
          authentifié possède un rôle qui détermine les actions qu'il peut effectuer et les
          données auxquelles il a accès.
        </p>

        <div className="spec-table mt-6">
          <div className="spec-table-header">
            <div className="flex-1">Rôle</div>
            <div className="flex-[3]">Permissions</div>
          </div>
          {ROLES.map((r) => (
            <div key={r.role} className="spec-table-row">
              <div className="flex-1 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${r.color}`} />
                <span className="font-medium text-sm">{r.role}</span>
              </div>
              <div className="flex-[3] text-sm text-gray-600">{r.perms}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 spec-note">
          <h4 className="font-semibold text-sm mb-1">Note sur la sécurité</h4>
          <p className="text-sm text-gray-600">
            Les permissions sont appliquées au niveau de la base de données via des politiques
            de sécurité au niveau des lignes (Row Level Security). Chaque association ne voit
            et ne modifie que ses propres données. L'administrateur a une visibilité globale.
          </p>
        </div>
      </div>

      {/* === Section 4: Architecture === */}
      <div className="spec-page">
        <div className="spec-section-num">4</div>
        <h2 className="spec-h2">Architecture technique</h2>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="spec-arch-card">
            <Monitor className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="font-semibold text-sm mb-1">Frontend</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>React 18 + TypeScript</li>
              <li>Vite (build & dev server)</li>
              <li>Tailwind CSS (design system)</li>
              <li>Lucide React (icônes)</li>
              <li>Application responsive</li>
            </ul>
          </div>
          <div className="spec-arch-card">
            <Database className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="font-semibold text-sm mb-1">Backend & Base de données</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>Supabase (PostgreSQL)</li>
              <li>Row Level Security (RLS)</li>
              <li>Authentification intégrée</li>
              <li>Stockage de fichiers (bucket)</li>
              <li>Edge Functions (Deno)</li>
            </ul>
          </div>
          <div className="spec-arch-card">
            <Layers className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="font-semibold text-sm mb-1">Infrastructure</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>Déploiement Docker / Nginx</li>
              <li>CI/CD GitHub Actions</li>
              <li>HTTPS, CORS configuré</li>
              <li>Sauvegarde automatique DB</li>
              <li>CDN pour les assets</li>
            </ul>
          </div>
        </div>

        <h3 className="spec-h3 mt-8">Modèle de données</h3>
        <p className="spec-p">
          La base de données comprend les tables principales suivantes, organisées autour de
          la hiérarchie Championnat/Coupe → Manche → Course, avec gestion des participants
          et de l'équipe nationale :
        </p>
        <div className="spec-table mt-4">
          <div className="spec-table-header">
            <div className="flex-1">Entité</div>
            <div className="flex-[2]">Description</div>
            <div className="flex-1">Relations clés</div>
          </div>
          {[
            { e: 'clubs', d: 'Associations de cyclisme', r: '1→∞ riders, 1→∞ docs annuels' },
            { e: 'riders', d: 'Coureurs licenciés', r: 'n→1 club, n→1 catégorie' },
            { e: 'categories', d: 'Catégories d\'âge/niveau', r: 'partagées (référence)' },
            { e: 'championships', d: 'Championnats (saison)', r: '1→∞ manches' },
            { e: 'cups', d: 'Coupes (multi-manches)', r: '1→∞ manches' },
            { e: 'stages', d: 'Manches / épreuves', r: 'n→1 championnat/coupe' },
            { e: 'races', d: 'Course par catégorie', r: 'n→1 manche, n→1 catégorie' },
            { e: 'registrations', d: 'Inscriptions des coureurs', r: 'n→1 course, n→1 coureur' },
            { e: 'results', d: 'Résultats & points', r: 'n→1 course, n→1 coureur' },
            { e: 'national_team_athletes', d: 'Athlètes équipe nationale', r: '1→∞ documents' },
            { e: 'club_annual_documents', d: 'Documents annuels des clubs', r: 'n→1 club' },
            { e: 'profiles', d: 'Profils utilisateurs & rôles', r: '1→1 auth.users' },
          ].map((row) => (
            <div key={row.e} className="spec-table-row">
              <div className="flex-1 font-mono text-sm font-medium text-primary-700">{row.e}</div>
              <div className="flex-[2] text-sm text-gray-600">{row.d}</div>
              <div className="flex-1 text-xs text-gray-500">{row.r}</div>
            </div>
          ))}
        </div>
      </div>

      {/* === Section 5: Modules === */}
      <div className="spec-page">
        <div className="spec-section-num">5</div>
        <h2 className="spec-h2">Modules fonctionnels</h2>
        <p className="spec-p">
          La plateforme est organisée en modules cohérents, chacun couvrant un domaine
          fonctionnel spécifique. Les modules sont accessibles via la barre de navigation
          latérale, organisée en sections thématiques.
        </p>

        <div className="mt-6 space-y-4">
          {MODULES.map((mod, idx) => (
            <div key={mod.title} className="spec-module">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 grid place-items-center shrink-0">
                  <mod.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm text-gray-900">
                  5.{idx + 1} — {mod.title}
                </h3>
              </div>
              <ul className="spec-ul-compact ml-12">
                {mod.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* === Section 6: Exigences non fonctionnelles === */}
      <div className="spec-page">
        <div className="spec-section-num">6</div>
        <h2 className="spec-h2">Exigences non fonctionnelles</h2>

        <h3 className="spec-h3">Performance</h3>
        <ul className="spec-ul">
          <li>Temps de chargement initial inférieur à 3 secondes sur connexion standard</li>
          <li>Requêtes de liste paginées et indexées sur les colonnes critiques</li>
          <li>Mise en cache des assets statiques (CSS, JS, images) via CDN</li>
          <li>Optimisation des images téléversées (circuit, affiche, passeport)</li>
        </ul>

        <h3 className="spec-h3">Ergonomie et accessibilité</h3>
        <ul className="spec-ul">
          <li>Interface responsive : adaptation mobile, tablette et desktop</li>
          <li>Mode sombre / mode clair persistant</li>
          <li>Conformité aux principes de contraste WCAG pour la lisibilité</li>
          <li>Navigation par menu latéral repliable sur mobile</li>
          <li>Feedback visuel immédiat sur toutes les actions (états de chargement, erreurs)</li>
        </ul>

        <h3 className="spec-h3">Disponibilité et fiabilité</h3>
        <ul className="spec-ul">
          <li>Architecture serverless avec redondance Supabase</li>
          <li>Sauvegarde automatique de la base de données</li>
          <li>Gestion des erreurs avec messages explicites en français</li>
          <li>Persistance de session (reconnexion automatique)</li>
        </ul>

        <h3 className="spec-h3">Évolutivité</h3>
        <ul className="spec-ul">
          <li>Architecture modulaire permettant l'ajout de nouvelles disciplines</li>
          <li>Barèmes de points configurables sans modification de code</li>
          <li>Schéma de base de données extensible (migrations incrémentales)</li>
          <li>Support multi-saisons avec historique complet</li>
        </ul>
      </div>

      {/* === Section 7: Sécurité === */}
      <div className="spec-page">
        <div className="spec-section-num">7</div>
        <h2 className="spec-h2">Sécurité & confidentialité</h2>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="spec-arch-card">
            <Lock className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="font-semibold text-sm mb-2">Authentification</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>Authentification Supabase (email/mot de passe)</li>
              <li>Session persistante avec rafraîchissement automatique</li>
              <li>Bannissement des comptes inactifs</li>
              <li>Création de comptes via edge function admin</li>
            </ul>
          </div>
          <div className="spec-arch-card">
            <ShieldCheck className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="font-semibold text-sm mb-2">Contrôle d'accès</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>Row Level Security sur toutes les tables</li>
              <li>Politiques par rôle (auth.uid(), is_admin())</li>
              <li>Isolation des données par association</li>
              <li>Fonctions SECURITY DEFINER pour actions privilégiées</li>
            </ul>
          </div>
        </div>

        <h3 className="spec-h3 mt-6">Protection des données</h3>
        <ul className="spec-ul">
          <li>Les associations ne peuvent accéder qu'à leurs propres coureurs et inscriptions</li>
          <li>Les documents (passeports, documents annuels) sont stockés dans des buckets Supabase Storage avec politiques d'accès</li>
          <li>Les mots de passe ne sont jamais stockés en clair (hash Supabase Auth)</li>
          <li>Les clés de service ne sont jamais exposées côté client (edge functions uniquement)</li>
          <li>En-têtes CORS stricts sur toutes les réponses d'edge functions</li>
        </ul>

        <h3 className="spec-h3">Conformité</h3>
        <ul className="spec-ul">
          <li>Les données personnelles des coureurs (date de naissance, contact) sont accessibles uniquement à l'association propriétaire et à l'administration</li>
          <li>Pas de partage de données avec des tiers</li>
          <li>Suppression en cascade possible (un coureur supprimé entraîne la suppression de ses inscriptions et résultats)</li>
        </ul>
      </div>

      {/* === Section 8: Livraisons === */}
      <div className="spec-page">
        <div className="spec-section-num">8</div>
        <h2 className="spec-h2">Livraisons & planning</h2>

        <h3 className="spec-h3">Livrables</h3>
        <div className="spec-table mt-4">
          <div className="spec-table-header">
            <div className="flex-1">Livrable</div>
            <div className="flex-1">Format</div>
            <div className="flex-1">Statut</div>
          </div>
          {[
            { l: 'Application web FTC Manager', f: 'Application déployée (Docker + Nginx)', s: 'Livré' },
            { l: 'Base de données Supabase', f: 'Schéma SQL + migrations', s: 'Livré' },
            { l: 'Edge functions (gestion users)', f: 'TypeScript / Deno', s: 'Livré' },
            { l: 'Documentation utilisateur', f: 'Intégrée à l\'application', s: 'Livré' },
            { l: 'Cahier des charges', f: 'PDF imprimable', s: 'Ce document' },
            { l: 'Code source', f: 'Dépôt Git', s: 'Livré' },
            { l: 'Pipeline CI/CD', f: 'GitHub Actions', s: 'Livré' },
          ].map((row) => (
            <div key={row.l} className="spec-table-row">
              <div className="flex-1 text-sm font-medium">{row.l}</div>
              <div className="flex-1 text-sm text-gray-600">{row.f}</div>
              <div className="flex-1">
                <span className="spec-status-badge"><Check className="w-3 h-3" /> {row.s}</span>
              </div>
            </div>
          ))}
        </div>

        <h3 className="spec-h3 mt-8">Technologies utilisées</h3>
        <div className="flex flex-wrap gap-2 mt-3">
          {['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'Supabase', 'PostgreSQL', 'Deno', 'Docker', 'Nginx', 'GitHub Actions', 'Lucide Icons'].map((tech) => (
            <span key={tech} className="spec-tech-badge">{tech}</span>
          ))}
        </div>

        <div className="mt-12 spec-footer">
          <div className="flex items-center gap-3 justify-center">
            <img src="/images/Federation_tunisienne_de_cyclisme_logo.png" alt="FTC" className="w-10 h-10 object-contain" />
            <div className="text-center">
              <p className="font-semibold text-sm">Fédération Tunisienne de Cyclisme</p>
              <p className="text-xs text-gray-500">FTC Manager — Cahier des charges v1.0 — Novembre 2026</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
          .no-print { display: none !important; }
          body, .spec-doc { background: white !important; color: black !important; }
          .spec-page {
            page-break-after: always;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }
          .spec-page:last-child { page-break-after: auto; }
          .spec-content { display: block !important; }
        }
      `}</style>
    </div>
  );
}
