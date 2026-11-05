import type { Metadata } from "next";
import Link from "next/link";

import Background from "@/components/Background";
import Section from "@/components/Section";
import Logo from "@/components/Logo";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/utils/site";

// Page de contenu statique (rendue côté serveur, en français) : règles complètes
// et conseils pour organiser un blindtest entre amis. Elle donne à Google une
// deuxième page riche en texte, distincte de l'accueil qui sert surtout à jouer.

const TITLE = "Comment jouer : règles du blindtest entre amis";
const DESCRIPTION =
  "Règles complètes de Museek, le blindtest en ligne avec vos playlists : créer un salon, ajouter une playlist, réglages, calcul des points et conseils pour une bonne partie.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/comment-jouer",
    languages: {
      "fr-FR": "/comment-jouer",
      en: "/en/how-to-play",
      "x-default": "/comment-jouer",
    },
  },
  openGraph: {
    type: "article",
    url: "/comment-jouer",
    locale: "fr_FR",
    title: `${TITLE} | Museek`,
    description: DESCRIPTION,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Museek - Blindtest musical",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Museek`,
    description: DESCRIPTION,
    images: ["/opengraph-image.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${SITE_URL}/comment-jouer#article`,
      headline: TITLE,
      description: DESCRIPTION,
      url: `${SITE_URL}/comment-jouer`,
      inLanguage: "fr-FR",
      image: `${SITE_URL}/opengraph-image.png`,
      datePublished: "2026-11-05",
      dateModified: "2026-11-05",
      about: { "@id": `${SITE_URL}/#game` },
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Museek",
          item: `${SITE_URL}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Comment jouer",
          item: `${SITE_URL}/comment-jouer`,
        },
      ],
    },
  ],
};

const linkClass =
  "text-(--white) underline transition-all duration-300 hover:text-(--accent)";
const buttonClass =
  "rounded-lg bg-(--accent) px-4 py-2 text-(--white) transition-all duration-300 hover:bg-(--accent)/60 active:scale-95";

export default function HowToPlayPage() {
  return (
    <Background>
      <JsonLd data={jsonLd} />
      <main className="mx-auto min-h-screen w-full px-8 md:max-w-lg lg:max-w-3xl">
        <article className="my-16 flex flex-col items-center gap-4 md:gap-8">
          <Link href="/" aria-label="Retour à l'accueil de Museek">
            <Logo />
          </Link>

          <div className="flex w-full flex-wrap items-center justify-between gap-2 text-sm">
            <nav aria-label="Fil d'Ariane">
              <Link href="/" className={linkClass}>
                Accueil
              </Link>
              <span className="text-(--white)/50"> / Comment jouer</span>
            </nav>
            <Link
              href="/en/how-to-play"
              hrefLang="en"
              lang="en"
              className={linkClass}
            >
              Read in English
            </Link>
          </div>

          <header className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-3xl font-bold md:text-4xl">
              Comment jouer à Museek ?
            </h1>
            <p className="text-(--white)/80">
              Museek est un blindtest musical en ligne où la musique vient des
              joueurs eux-mêmes : chacun apporte une playlist Spotify, Deezer ou
              Apple Music, Museek mélange les morceaux, et il faut retrouver
              l&apos;artiste et le titre de chaque extrait. Voici les règles
              complètes et quelques conseils pour réussir votre partie entre
              amis.
            </p>
            <Link href="/" className={buttonClass}>
              Créer une partie
            </Link>
          </header>

          <Section>
            <h2>Ce qu&apos;il vous faut</h2>
            <ul className="flex list-outside list-disc flex-col gap-1 pl-4">
              <li>
                Un navigateur, sur ordinateur, tablette ou mobile. Rien à
                installer et aucun compte à créer : un pseudo suffit.
              </li>
              <li>
                Une playlist <strong>publique</strong> par joueur, sur Spotify,
                Deezer ou Apple Music.
              </li>
              <li>
                Des amis : de 1 à 12 joueurs par salon. Le blindtest est plus
                drôle à partir de 3, quand on peut aussi deviner qui a choisi
                chaque morceau.
              </li>
              <li>
                Un appel vocal (Discord, Zoom, téléphone…) si vous n&apos;êtes
                pas dans la même pièce : Museek n&apos;a pas de chat intégré.
              </li>
            </ul>
          </Section>

          <Section>
            <h2>Lancer une partie en 4 étapes</h2>
            <ol className="flex list-outside list-decimal flex-col gap-3 pl-5">
              <li>
                <strong>Créez un salon.</strong> Sur{" "}
                <Link href="/" className={linkClass}>
                  la page d&apos;accueil
                </Link>
                , entrez votre pseudo et cliquez sur « Créer ». Vous devenez
                l&apos;hôte de la partie et un code de salon s&apos;affiche.
              </li>
              <li>
                <strong>Invitez vos amis.</strong> Envoyez-leur le code : ils
                entrent leur pseudo, collent le code et cliquent sur « Rejoindre
                ».
              </li>
              <li>
                <strong>Ajoutez vos playlists.</strong> Chaque joueur colle le
                lien de partage d&apos;une de ses playlists publiques, puis se
                déclare prêt. Sur Spotify et Apple Music, le lien se copie
                depuis le menu « … » de la playlist ; sur Deezer, avec le bouton
                « Partager ».
              </li>
              <li>
                <strong>Lancez la partie.</strong> Quand tout le monde est prêt,
                l&apos;hôte clique sur « Lancer ». Museek pioche des morceaux au
                hasard dans chaque playlist et les mélange.
              </li>
            </ol>
          </Section>

          <Section>
            <h2>Les réglages du salon</h2>
            <p>Avant de lancer, l&apos;hôte adapte la partie à son groupe :</p>
            <ul className="flex list-outside list-disc flex-col gap-2 pl-4">
              <li>
                <strong>Nombre de morceaux par playlist</strong>, de 1 à 30.
                Avec 4 joueurs et 5 morceaux chacun, la partie compte 20
                manches.
              </li>
              <li>
                <strong>Temps par morceau</strong>, de 5 à 30 secondes. 30
                secondes laissent le temps d&apos;écrire ; 10 secondes
                transforment la partie en épreuve de réflexes.
              </li>
              <li>
                <strong>Deviner qui a choisi le morceau</strong>, disponible à
                partir de 3 joueurs. Chaque manche, il faut aussi retrouver le
                joueur dont la playlist contient l&apos;extrait.
              </li>
              <li>
                <strong>Aide</strong>, au choix de chaque joueur : la pochette
                de l&apos;album se défloute entre 10 et 5 secondes avant la fin
                de la manche. Les joueurs qui jouent sans aide gagnent un point
                bonus à chaque réponse parfaite.
              </li>
            </ul>
          </Section>

          <Section>
            <h2>Comment sont comptés les points</h2>
            <p>
              Le blindtest de Museek n&apos;est pas une course : la vitesse ne
              compte pas, et tout le monde peut marquer sur chaque morceau. Vous
              avez jusqu&apos;à la fin du temps pour écrire vos réponses.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-(--white)/20">
                    <th className="py-2 pr-4">Réponse</th>
                    <th className="py-2">Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-(--white)/10">
                    <td className="py-2 pr-4">Le bon artiste</td>
                    <td className="py-2">1 point</td>
                  </tr>
                  <tr className="border-b border-(--white)/10">
                    <td className="py-2 pr-4">
                      Une partie des artistes d&apos;un featuring
                    </td>
                    <td className="py-2">½ point</td>
                  </tr>
                  <tr className="border-b border-(--white)/10">
                    <td className="py-2 pr-4">Le bon titre</td>
                    <td className="py-2">1 point</td>
                  </tr>
                  <tr className="border-b border-(--white)/10">
                    <td className="py-2 pr-4">
                      Le joueur qui a choisi le morceau (option)
                    </td>
                    <td className="py-2">1 point</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">
                      Artiste et titre parfaits, sans l&apos;aide
                    </td>
                    <td className="py-2">+1 point bonus</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Le point « joueur » compte même quand le morceau vient de votre
              propre playlist : reconnaître vos goûts fait partie du jeu. À la
              fin, le classement s&apos;affiche avec, pour chaque morceau, un
              lien vers la plateforme d&apos;origine pour le réécouter.
            </p>
          </Section>

          <Section>
            <h2>Pas besoin d&apos;écrire parfaitement</h2>
            <p>
              Fautes d&apos;accents, majuscules ou titres en japonais écrits en
              caractères latins : la saisie est tolérante et une autocomplétion
              vous aide. Tous les détails sont dans la{" "}
              <Link href="/#faq" className={linkClass}>
                FAQ
              </Link>
              .
            </p>
          </Section>

          <Section>
            <h2>Nos conseils pour un bon blindtest entre amis</h2>
            <ul className="flex list-outside list-disc flex-col gap-2 pl-4">
              <li>
                <strong>Choisissez une playlist qui vous ressemble.</strong> Le
                sel de Museek, c&apos;est de découvrir ce qu&apos;écoutent vos
                amis. Une playlist trop générique rend le point « joueur »
                impossible à gagner.
              </li>
              <li>
                <strong>Visez entre 3 et 10 morceaux par playlist.</strong> Au
                delà, la partie devient longue pour un grand groupe : comptez
                environ une minute par manche avec le temps de réponse et la
                révélation.
              </li>
              <li>
                <strong>Mélangez les niveaux.</strong> Les joueurs qui débutent
                peuvent activer l&apos;aide de la pochette, pendant que les
                habitués jouent sans pour le point bonus.
              </li>
              <li>
                <strong>Vérifiez vos liens avant la soirée.</strong> La playlist
                doit être publique. Si un lien ne fonctionne pas, Museek
                prévient tout le monde et le joueur concerné peut le corriger
                sans recharger les autres playlists.
              </li>
            </ul>
          </Section>

          <Section>
            <h2>Une question ?</h2>
            <p>
              La{" "}
              <Link href="/#faq" className={linkClass}>
                FAQ de l&apos;accueil
              </Link>{" "}
              explique comment copier le lien d&apos;une playlist sur chaque
              plateforme et quoi faire si elle ne se charge pas. Les{" "}
              <Link href="/mentions-et-politiques" className={linkClass}>
                mentions et politiques
              </Link>{" "}
              détaillent les données traitées pendant une partie (aucune
              n&apos;est conservée).
            </p>
          </Section>

          <footer className="mt-4 flex w-full flex-col items-center gap-4 text-center">
            <Link href="/" className={buttonClass}>
              Jouer à Museek
            </Link>
            <p className="text-(--white)/50">
              Museek est un projet indépendant, ni affilié, ni sponsorisé, ni
              approuvé par Spotify, Deezer ou Apple Music.
            </p>
            <p className="text-(--white)/50">© 2026 Museek</p>
          </footer>
        </article>
      </main>
    </Background>
  );
}
