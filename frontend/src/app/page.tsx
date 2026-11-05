import fr from "@/locales/fr.json";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/utils/site";
import HomeApp from "./HomeApp";

// La FAQ des données structurées reprend celle affichée sur l'accueil (fr.json),
// pour que les deux restent identiques. Les réponses sont converties en texte brut.
const stripHtml = (value: string) =>
  value
    .replace(/<\/li>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const faqEntries = Object.keys(fr.home)
  .filter((key) => /^faq-q\d+$/.test(key))
  .map((key) => {
    const home = fr.home as Record<string, string>;
    return {
      question: home[key],
      answer: stripHtml(home[key.replace("faq-q", "faq-a")]),
    };
  });

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Museek",
      url: `${SITE_URL}/`,
      inLanguage: "fr-FR",
    },
    {
      "@type": ["VideoGame", "WebApplication"],
      "@id": `${SITE_URL}/#game`,
      name: "Museek",
      url: `${SITE_URL}/`,
      description:
        "Blindtest musical multijoueur en ligne : chaque joueur apporte sa playlist Spotify, Deezer ou Apple Music, Museek les mélange et il faut deviner l'artiste et le titre. Gratuit, sans compte, jusqu'à 12 joueurs.",
      image: `${SITE_URL}/opengraph-image.png`,
      genre: ["Quiz musical", "Blindtest", "Jeu de soirée"],
      gamePlatform: ["Navigateur web", "Mobile", "Ordinateur"],
      applicationCategory: "GameApplication",
      operatingSystem: "Tous (navigateur web)",
      playMode: "MultiPlayer",
      numberOfPlayers: {
        "@type": "QuantitativeValue",
        minValue: 1,
        maxValue: 12,
      },
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      inLanguage: ["fr-FR", "en"],
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      url: `${SITE_URL}/`,
      inLanguage: "fr-FR",
      mainEntity: faqEntries.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ],
};

export default function Page() {
  return (
    <>
      <JsonLd data={jsonLd} />
      <HomeApp />
    </>
  );
}
