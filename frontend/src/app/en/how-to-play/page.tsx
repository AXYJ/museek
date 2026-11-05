import type { Metadata } from "next";
import Link from "next/link";

import Background from "@/components/Background";
import Section from "@/components/Section";
import Logo from "@/components/Logo";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/utils/site";

// Version anglaise de /comment-jouer (rendue côté serveur). Les deux pages se
// déclarent mutuellement via hreflang. Le <html lang="fr"> vient du layout
// racine : l'<article lang="en"> indique la vraie langue du contenu.

const TITLE = "How to play: rules of the music quiz with friends";
const DESCRIPTION =
  "Full rules of Museek, the online music blind test played with your own playlists: create a room, add a playlist, settings, scoring and tips for a great game night.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/en/how-to-play",
    languages: {
      "fr-FR": "/comment-jouer",
      en: "/en/how-to-play",
      "x-default": "/comment-jouer",
    },
  },
  openGraph: {
    type: "article",
    url: "/en/how-to-play",
    locale: "en_US",
    alternateLocale: ["fr_FR"],
    title: `${TITLE} | Museek`,
    description: DESCRIPTION,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Museek - Music blind test",
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
      "@id": `${SITE_URL}/en/how-to-play#article`,
      headline: TITLE,
      description: DESCRIPTION,
      url: `${SITE_URL}/en/how-to-play`,
      inLanguage: "en",
      image: `${SITE_URL}/opengraph-image.png`,
      datePublished: "2026-11-05",
      dateModified: "2026-11-05",
      about: { "@id": `${SITE_URL}/#game` },
      isPartOf: { "@id": `${SITE_URL}/#website` },
      translationOfWork: { "@id": `${SITE_URL}/comment-jouer#article` },
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
          name: "How to play",
          item: `${SITE_URL}/en/how-to-play`,
        },
      ],
    },
  ],
};

const linkClass =
  "text-(--white) underline transition-all duration-300 hover:text-(--accent)";
const buttonClass =
  "rounded-lg bg-(--accent) px-4 py-2 text-(--white) transition-all duration-300 hover:bg-(--accent)/60 active:scale-95";

export default function HowToPlayEnPage() {
  return (
    <Background>
      <JsonLd data={jsonLd} />
      <main className="mx-auto min-h-screen w-full px-8 md:max-w-lg lg:max-w-3xl">
        <article
          lang="en"
          className="my-16 flex flex-col items-center gap-4 md:gap-8"
        >
          <Link href="/" aria-label="Back to the Museek home page">
            <Logo />
          </Link>

          <div className="flex w-full flex-wrap items-center justify-between gap-2 text-sm">
            <nav aria-label="Breadcrumb">
              <Link href="/" className={linkClass}>
                Home
              </Link>
              <span className="text-(--white)/50"> / How to play</span>
            </nav>
            <Link
              href="/comment-jouer"
              hrefLang="fr"
              lang="fr"
              className={linkClass}
            >
              Lire en français
            </Link>
          </div>

          <header className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-3xl font-bold md:text-4xl">
              How to play Museek
            </h1>
            <p className="text-(--white)/80">
              Museek is an online music blind test where the music comes from
              the players themselves: everyone brings a Spotify, Deezer or Apple
              Music playlist, Museek shuffles the tracks together, and you have
              to name the artist and the title of each clip. Here are the full
              rules and a few tips for a great game with friends.
            </p>
            <Link href="/" className={buttonClass}>
              Create a game
            </Link>
          </header>

          <Section>
            <h2>What you need</h2>
            <ul className="flex list-outside list-disc flex-col gap-1 pl-4">
              <li>
                A web browser, on a computer, tablet or phone. Nothing to
                install and no account to create: a nickname is all it takes.
              </li>
              <li>
                One <strong>public</strong> playlist per player, on Spotify,
                Deezer or Apple Music.
              </li>
              <li>
                Friends: from 1 to 12 players per room. It gets really fun from
                3 players, when you can also guess who picked each track.
              </li>
              <li>
                A voice call (Discord, Zoom, phone…) if you are not in the same
                room: Museek has no built-in chat.
              </li>
            </ul>
          </Section>

          <Section>
            <h2>Start a game in 4 steps</h2>
            <ol className="flex list-outside list-decimal flex-col gap-3 pl-5">
              <li>
                <strong>Create a room.</strong> On{" "}
                <Link href="/" className={linkClass}>
                  the home page
                </Link>
                , enter your nickname and click “Create”. You become the host
                and a room code appears.
              </li>
              <li>
                <strong>Invite your friends.</strong> Send them the code: they
                enter their nickname, paste the code and click “Join”.
              </li>
              <li>
                <strong>Add your playlists.</strong> Each player pastes the
                share link of one of their public playlists, then marks
                themselves as ready. On Spotify and Apple Music, copy the link
                from the playlist’s “…” menu; on Deezer, use the “Share” button.
              </li>
              <li>
                <strong>Launch the game.</strong> Once everyone is ready, the
                host clicks “Launch”. Museek picks random tracks from each
                playlist and shuffles them.
              </li>
            </ol>
          </Section>

          <Section>
            <h2>Room settings</h2>
            <p>Before launching, the host tunes the game to the group:</p>
            <ul className="flex list-outside list-disc flex-col gap-2 pl-4">
              <li>
                <strong>Tracks per playlist</strong>, from 1 to 30. With 4
                players and 5 tracks each, the game has 20 rounds.
              </li>
              <li>
                <strong>Time per track</strong>, from 5 to 30 seconds. 30
                seconds leaves time to type; 10 seconds turns the game into a
                reflex test.
              </li>
              <li>
                <strong>Guess who picked the track</strong>, available from 3
                players. Each round, you also have to find the player whose
                playlist the clip comes from.
              </li>
              <li>
                <strong>Hint</strong>, chosen by each player: the album cover
                gets unblurred between 10 and 5 seconds before the end of the
                round. Players who play without the hint earn a bonus point for
                every perfect answer.
              </li>
            </ul>
          </Section>

          <Section>
            <h2>How scoring works</h2>
            <p>
              Museek is not a race: speed does not matter, and everyone can
              score on every track. You have until the timer runs out to type
              your answers.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-(--white)/20">
                    <th className="py-2 pr-4">Answer</th>
                    <th className="py-2">Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-(--white)/10">
                    <td className="py-2 pr-4">The right artist</td>
                    <td className="py-2">1 point</td>
                  </tr>
                  <tr className="border-b border-(--white)/10">
                    <td className="py-2 pr-4">
                      Some of the artists on a featuring
                    </td>
                    <td className="py-2">½ point</td>
                  </tr>
                  <tr className="border-b border-(--white)/10">
                    <td className="py-2 pr-4">The right title</td>
                    <td className="py-2">1 point</td>
                  </tr>
                  <tr className="border-b border-(--white)/10">
                    <td className="py-2 pr-4">
                      The player who picked the track (option)
                    </td>
                    <td className="py-2">1 point</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">
                      Perfect artist and title, without the hint
                    </td>
                    <td className="py-2">+1 bonus point</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              The “player” point counts even when the track comes from your own
              playlist: recognising your own taste is part of the game. At the
              end, the leaderboard shows every track with a link to its original
              platform so you can listen to it again.
            </p>
          </Section>

          <Section>
            <h2>No need to type perfectly</h2>
            <p>
              Missing accents, capital letters, or Japanese titles typed in
              Latin letters: input is forgiving and autocomplete helps you out.
              All the details are in the{" "}
              <Link href="/#faq" className={linkClass}>
                FAQ
              </Link>
              .
            </p>
          </Section>

          <Section>
            <h2>Tips for a great music quiz night</h2>
            <ul className="flex list-outside list-disc flex-col gap-2 pl-4">
              <li>
                <strong>Pick a playlist that feels like you.</strong> The fun of
                Museek is discovering what your friends listen to. A generic
                playlist makes the “player” point impossible to earn.
              </li>
              <li>
                <strong>Aim for 3 to 10 tracks per playlist.</strong> Beyond
                that, the game gets long for a big group: count about one minute
                per round, including answer time and the reveal.
              </li>
              <li>
                <strong>Try a themed night.</strong> 2000s hits, cartoon theme
                songs, movie soundtracks, hip-hop, K-pop… Everyone prepares a
                playlist on the theme, and the blind test becomes a real music
                trivia challenge.
              </li>
              <li>
                <strong>Mix skill levels.</strong> Newcomers can turn on the
                cover hint while regulars play without it for the bonus point.
              </li>
              <li>
                <strong>Check your links before the party.</strong> The playlist
                must be public. If a link does not work, Museek warns everyone
                and that player can fix it without reloading the other
                playlists.
              </li>
            </ul>
          </Section>

          <Section>
            <h2>Any questions?</h2>
            <p>
              The{" "}
              <Link href="/#faq" className={linkClass}>
                FAQ on the home page
              </Link>{" "}
              explains how to copy a playlist link on each platform and what to
              do if it does not load. The{" "}
              <Link href="/mentions-et-politiques" className={linkClass}>
                legal notice and privacy policy
              </Link>{" "}
              describe the data processed during a game (none of it is kept).
            </p>
          </Section>

          <footer className="mt-4 flex w-full flex-col items-center gap-4 text-center">
            <Link href="/" className={buttonClass}>
              Play Museek
            </Link>
            <p className="text-(--white)/50">
              Museek is an independent project, not affiliated with, sponsored
              or endorsed by Spotify, Deezer or Apple Music.
            </p>
            <p className="text-(--white)/50">© 2026 Museek</p>
          </footer>
        </article>
      </main>
    </Background>
  );
}
