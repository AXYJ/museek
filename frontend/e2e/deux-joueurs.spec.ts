import { test, expect, type Page } from "@playwright/test";

// Chaque joueur a son propre "contexte" : un navigateur isolé, avec ses propres cookies,
// localStorage et connexion socket. C'est comme deux personnes sur deux ordinateurs.

// Playlist démo du lobby. Le backend la charge depuis Deezer : ce test a besoin d'internet.
const PLAYLIST_DEMO = "https://www.deezer.com/playlist/15980647503";

// Crée une partie depuis l'accueil et renvoie le code de la room
async function creerPartie(page: Page, pseudo: string): Promise<string> {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Votre pseudo" }).fill(pseudo);
  await page.getByRole("button", { name: "Créer" }).click();

  // Le code s'affiche dans le bouton « Code de la partie : AB12CD »
  const boutonCode = page.getByRole("button", { name: /Code de la partie/ });
  await expect(boutonCode).toBeVisible();
  const code = (await boutonCode.textContent())?.match(/:\s*(\w+)/)?.[1];
  if (!code) throw new Error("Code de la partie introuvable");
  return code;
}

// Rejoint une partie depuis l'accueil avec un code
async function rejoindrePartie(page: Page, pseudo: string, code: string) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Votre pseudo" }).fill(pseudo);
  await page.getByRole("textbox", { name: "Code de la room" }).fill(code);
  await page.getByRole("button", { name: "Rejoindre" }).click();
}

test("deux joueurs : création, invitation, partie, résultats, rejouer", async ({
  browser,
}) => {
  // Une partie réelle prend du temps (chargement de la playlist + un tour complet)
  test.setTimeout(120_000);

  // Deux contextes = deux joueurs indépendants
  const contexteHote = await browser.newContext();
  const contexteInvite = await browser.newContext();
  const hote = await contexteHote.newPage();
  const invite = await contexteInvite.newPage();

  try {
    // 1. L'hôte crée la partie
    const code = await creerPartie(hote, "Hôte");

    // 2. L'invité la rejoint avec le code
    await rejoindrePartie(invite, "Invité", code);

    // 3. Chacun voit l'autre dans la liste des joueurs.
    // Son propre pseudo est un champ modifiable, celui des autres un simple texte.
    await expect(
      invite.getByRole("heading", { name: "Liste des joueurs" }),
    ).toBeVisible();
    await expect(invite.getByText("Hôte", { exact: true })).toBeVisible();
    await expect(hote.getByText("Invité", { exact: true })).toBeVisible();

    // 4. Tant que l'invité n'est pas prêt, l'hôte ne peut pas lancer
    await expect(
      hote.getByRole("button", { name: "Lancer (1/2)" }),
    ).toBeDisabled();

    // 5. L'invité se met prêt : l'hôte peut lancer
    await invite.getByRole("button", { name: "Prêt" }).click();
    await expect(
      hote.getByRole("button", { name: "Lancer (2/2)" }),
    ).toBeEnabled();

    // À TOI DE JOUER : la suite du parcours, sur le modèle de parcours-joueur.spec.ts
    // 6. L'hôte règle 1 morceau / 5 s et colle la playlist démo ; l'invité aussi (ou rien)
    const moins = hote.locator("button:has(svg.lucide-minus)");
    const nbMorceaux = moins.nth(0);
    const temps = moins.nth(1);
    while (await nbMorceaux.isEnabled()) await nbMorceaux.click(); // jusqu'à 1
    while (await temps.isEnabled()) await temps.click(); // jusqu'à 5 s

    // L'invité n'ajoute pas de playlist : la partie se joue avec celle de l'hôte
    await hote
      .getByRole("textbox", { name: "URL de la playlist publique" })
      .fill(PLAYLIST_DEMO);

    // 7. L'hôte clique sur « Lancer (2/2) »
    await hote.getByRole("button", { name: "Lancer (2/2)" }).click();

    // 8. Les DEUX joueurs voient les champs « Artiste » et « Morceau »
    const champArtisteHote = hote.getByRole("textbox", { name: "Artiste" });
    const champArtisteInvite = invite.getByRole("textbox", { name: "Artiste" });
    await expect(champArtisteHote).toBeVisible({ timeout: 60_000 });
    await champArtisteHote.fill("Un artiste au hasard");
    await hote
      .getByRole("textbox", { name: "Morceau" })
      .fill("Un titre au hasard");
    await hote.keyboard.press("Escape");

    await expect(champArtisteInvite).toBeVisible({ timeout: 60_000 });
    await champArtisteInvite.fill("Un autre artiste");
    await invite
      .getByRole("textbox", { name: "Morceau" })
      .fill("Un autre titre");
    await invite.keyboard.press("Escape");

    await expect(hote.getByText(/Révélation/)).toBeVisible({ timeout: 15_000 });
    await expect(invite.getByText(/Révélation/)).toBeVisible({
      timeout: 15_000,
    });

    // 9. Les DEUX arrivent sur « Résultat de la partie », et chacun voit les deux pseudos
    for (const joueur of [hote, invite]) {
      await expect(
        joueur.getByRole("heading", { name: "Résultat de la partie" }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(joueur.getByText("Hôte").first()).toBeVisible();
      await expect(joueur.getByText("Invité").first()).toBeVisible();
    }

    // 10. Rejouer ramène chacun au lobby
    for (const joueur of [hote, invite]) {
      await joueur.getByRole("button", { name: "Rejouer" }).click();
      await expect(
        joueur.getByRole("heading", { name: "Liste des joueurs" }),
      ).toBeVisible();
    }
  } finally {
    // Toujours fermer les contextes, même si une vérification échoue
    await contexteHote.close();
    await contexteInvite.close();
  }
});
