import { test, expect } from "@playwright/test";

// Playlist démo du lobby (la même que l'interrupteur « Utiliser la playlist démo »).
// Le backend la charge depuis Deezer : ce test a besoin d'internet.
const PLAYLIST_DEMO = "https://www.deezer.com/playlist/15980647503";

test("parcours d'un joueur : accueil, lobby, partie, résultats, rejouer", async ({
  page,
}) => {
  // Une partie réelle prend du temps (chargement de la playlist + un tour complet)
  test.setTimeout(120_000);

  // 1. Accueil : choisir un pseudo et créer une partie
  await page.goto("/");
  await page.getByRole("textbox", { name: "Votre pseudo" }).fill("Testeur");
  await page.getByRole("button", { name: "Créer" }).click();

  // 2. Lobby : on y est, et on y apparaît
  await expect(
    page.getByRole("heading", { name: "Liste des joueurs" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Code de la partie/ }),
  ).toBeVisible();

  // Partie la plus courte possible : 1 morceau, 5 secondes.
  // Les boutons - et + n'ont pas de nom accessible : on les repère par leur icône.
  // Le 1er « - » règle le nombre de morceaux, le 2e le temps par morceau.
  const moins = page.locator("button:has(svg.lucide-minus)");
  const nbMorceaux = moins.nth(0);
  const temps = moins.nth(1);
  while (await nbMorceaux.isEnabled()) await nbMorceaux.click(); // jusqu'à 1
  while (await temps.isEnabled()) await temps.click(); // jusqu'à 5 s

  await page
    .getByRole("textbox", { name: "URL de la playlist publique" })
    .fill(PLAYLIST_DEMO);
  await page.getByRole("button", { name: "Lancer (1/1)" }).click();

  // 3. Partie : les champs de réponse apparaissent une fois la playlist chargée
  const champArtiste = page.getByRole("textbox", { name: "Artiste" });
  await expect(champArtiste).toBeVisible({ timeout: 60_000 });
  await champArtiste.fill("Un artiste au hasard");
  await page
    .getByRole("textbox", { name: "Morceau" })
    .fill("Un titre au hasard");
  await page.keyboard.press("Escape");

  // Fin du temps de réponse : la bonne réponse est révélée
  await expect(page.getByText(/Révélation/)).toBeVisible({ timeout: 15_000 });

  // 4. Résultats : la partie se termine et le joueur figure au tableau
  await expect(
    page.getByRole("heading", { name: "Résultat de la partie" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Testeur").first()).toBeVisible();

  // 5. Rejouer ramène au lobby
  await page.getByRole("button", { name: "Rejouer" }).click();
  await expect(
    page.getByRole("heading", { name: "Liste des joueurs" }),
  ).toBeVisible();
});
