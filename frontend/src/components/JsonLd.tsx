// Données structurées schema.org, rendues côté serveur.
// "<" est échappé pour qu'une chaîne ne puisse jamais fermer la balise <script>.
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
