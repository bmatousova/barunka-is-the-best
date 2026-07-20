# Jak mít jednodušší život s Barunkou

A small, private website that helps him understand where you're likely at in
your cycle today — and how to support you. Built to feel like a thoughtful
gift, not a dashboard.

It's a static site: plain HTML, CSS, and JavaScript, no server, no
database, no build tools. All the actual words and settings live in one
file you can edit yourself, any time: `data/cycle-data.json`.

## What's inside

- `index.html` — the page itself
- `styles.css` — all the visual styling
- `script.js` — the logic: reads the content file, works out today's cycle
  day and phase, draws the calendar
- `data/cycle-data.json` — **all the content and settings live here.** This
  is the file you'll come back to edit.
- `.nojekyll` — a technical flag GitHub Pages needs; you can ignore it
- `robots.txt` — asks search engines not to index this site

## How to publish on GitHub Pages

You don't need to know how to code for this part — just follow along.

1. **Create or use a GitHub repository.** Go to github.com and log in as
   `bmatousova`. Click the green "New" button to start a repository. Give it
   any name you like — a low-key, unrelated-sounding name is a good idea,
   since the name becomes part of the web address (e.g. avoid anything
   obviously about cycles or periods). Leave it set to "Public" (GitHub
   Pages needs that on a free account) and click "Create repository."
2. **Upload the project files.** On your new repository's page, click "Add
   file" → "Upload files." Drag in every file from this project, including
   the whole `data` folder with `cycle-data.json` inside it, and the
   `.nojekyll` file (it can look invisible in some file browsers — make
   sure it's included; if your computer hides it, unzip the project fresh
   and drag the whole unzipped folder's contents in at once). Scroll down
   and click "Commit changes."
3. **Open your repository's Settings.** Click the "Settings" tab near the
   top of the repository page.
4. **Open the Pages section.** In the left-hand menu, click "Pages."
5. **Choose "Deploy from a branch."** Under "Source," make sure this
   option is selected.
6. **Select the main branch and root folder.** In the branch dropdown pick
   `main`, leave the folder as `/ (root)`, then click "Save."
7. **Open your live link.** Wait a minute or two, refresh the Pages
   settings page, and a link will appear —
   `https://bmatousova.github.io/your-repo-name/`. That's your live site,
   safe to send to him.

A note on local previewing: if you double-click `index.html` on your own
computer before publishing, the content likely won't load — that's just a
browser security rule about local files, not a bug. The site works
correctly once it's live on GitHub Pages. Easiest is to just publish it
(step 1–7 above only takes a few minutes) and check the real link.

## Updating it later

Since there's no login or database, everything about your cycle lives in
`data/cycle-data.json`, specifically the `"anchorDate"` field. When your
next period actually starts, or if the pattern drifts:

1. On GitHub, open `data/cycle-data.json` in your repository.
2. Click the pencil (edit) icon.
3. Update `"anchorDate"` to the new date, in `YYYY-MM-DD` format.
4. Click "Commit changes."

The live site updates automatically within a minute or two. You can always
come back and ask Claude to make this edit for you instead.

## Things to customize later

- The lines marked `(uprav podle sebe – to customize later)` inside
  `playfulLines` in `data/cycle-data.json` are placeholder flirty
  one-liners, one per phase. Swap them for real inside jokes or things only
  the two of you would get.
- All the content is in Czech and was AI-drafted from what you described —
  worth a quick read-through before you call it finished, just to make sure
  every line sounds like something you'd actually say.
- No passphrase lock or extra privacy step was built in for this version,
  since you asked to keep it simple for now — the live link is public
  (though not indexed by search engines, and not easy to stumble on by
  accident). If you'd like a playful lock screen or a more private setup
  later, just ask.
- Small decorative touches (a simple icon per phase, a different accent
  color) can be added any time — the design is intentionally minimal so
  it's easy to build on later.
