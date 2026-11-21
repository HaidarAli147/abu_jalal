# Friday Room Cleaning

Weekly rota for cleaning the kids' room at the family house. Four groups take turns, one per Friday. Styled like the Retro TV interface, so it also works as a web-app tile on the TV.

The data lives in `schedule.json` (groups, first Friday, one-off swaps). The page reads it every time it opens, so the rotation moves on by itself.

## Use it

Host it with GitHub Pages (Settings > Pages > Deploy from branch > `main` / root) and share the link. Opening `index.html` straight from disk won't load the schedule; use Pages or `python3 -m http.server`.

## Admin: change the schedule

Click **إدارة** at the bottom of the page. You can:

- edit the groups and the first Friday (permanent change);
- add a **one-Friday swap** when someone skips and another person cleans for them. The normal rotation carries on unchanged afterwards.

**Login** is a password. Set it up once (needs Node on your computer):

1. Create a GitHub token for this repo only: GitHub > Settings > Developer settings > Fine-grained tokens, Contents = Read and write.
2. Copy `.env.example` to `.env` (git-ignored, never uploaded) and fill in the password (12+ characters), the token and `owner/repo`.
3. Run `node tools/encrypt.mjs`, then commit and push `admin.enc.json`.

The page decrypts the token in the browser with the password and keeps it in memory only. Saving commits `schedule.json`; the change shows for everyone after about a minute. To change the password or token, edit `.env` and run the script again.

The password only protects a public encrypted file, so use a long one: a short password can be guessed offline.

You can also edit `schedule.json` directly on GitHub.

Note: GitHub Pages on a free account needs a public repo, so the names in `schedule.json` are public.

## Self-check

Open `index.html?test` (via a server) and look at the browser console; no assertion errors means the rota logic passes.
