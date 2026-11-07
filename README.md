# Gut Check — guess what really happened

**Play: [vonkarts.com](https://vonkarts.com)** · free, no ads, no sign-up

A daily guessing game built on real, published experiments. Every day one study goes live in five languages. You read the setup, say what *you* would do, then guess what the participants actually did. After that you get the result, the original sources, and what science thinks of the finding today, including whether it held up when others tried to repeat it.

| Language | Game | Link |
|---|---|---|
| English | Gut Check | [vonkarts.com](https://vonkarts.com/) |
| Türkçe | Sezgi Testi | [vonkarts.com/tr](https://vonkarts.com/tr/) |
| Deutsch | Bauchgefühl | [vonkarts.com/de](https://vonkarts.com/de/) |
| Français | Intuition | [vonkarts.com/fr](https://vonkarts.com/fr/) |
| Español | Corazonada | [vonkarts.com/es](https://vonkarts.com/es/) |

## How experiments are picked and checked

- Every experiment is a real study published in a scientific journal. Topics come from any field: psychology, medicine, economics, animals, physics, sport.
- Every number is checked against the original paper or another reliable source, and the links are listed on the page.
- Famous findings that later failed to replicate, or that were criticised, are included on purpose. The "What we know today" section says so plainly.
- AI (Claude) helps with research, drafts and translation. Numbers come from the sources, and all five languages are compared sentence by sentence before publishing.

More: [About & method](https://vonkarts.com/about/)

## Your data

Your streak and history stay in your own browser. Visits and guesses are counted with [GoatCounter](https://www.goatcounter.com/help/privacy): no cookies, no stored IP addresses, only totals. Details on the [About page](https://vonkarts.com/about/).

## Found a mistake?

[Open an issue](https://github.com/vonkarts/vonkarts.github.io/issues) with the page link and what is wrong. Corrections are welcome in any of the five languages.

---

<details>
<summary>How the site works (for developers)</summary>

Jekyll on GitHub Pages, no build step of its own.

- Live experiments: `_experiments/<lang>/NNN-slug.md`
- Queue: `_queue/<lang>/` (one goes live every day at 00:01 UTC via `release.yml`)
- Interface text: `_data/game.yml`
- Template: `_layouts/experiment.html`; style and game logic: `assets/game/`
- Share images: `images/cards/` (`.github/scripts/make_cards.py`)
- Checks after every build: links, five-language consistency, Lighthouse, SEO and a visual check that plays one round on a phone.

</details>
