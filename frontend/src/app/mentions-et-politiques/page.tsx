import type { Metadata } from "next";
import Background from "@/components/Background";
import Mentions from "./Mentions";

export const metadata: Metadata = {
  title: "Mentions et politiques",
  description:
    "Mentions légales, conditions d'utilisation et politique de confidentialité de Museek, le blindtest musical multijoueur : données traitées, durées de conservation et droits RGPD.",
  alternates: { canonical: "/mentions-et-politiques" },
};

export default function MentionsPage() {
  return (
    <Background>
      <main className="mx-auto min-h-screen w-full px-8 md:max-w-lg lg:max-w-3xl">
        <Mentions />
      </main>
    </Background>
  );
}
