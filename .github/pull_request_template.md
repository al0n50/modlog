## What & why
<!-- What changed, and why. Link the issue if there is one. -->

## How it was tested
<!-- Commands run, what you checked on localhost and on the live site after deploy. -->

## Preview
<!-- Vercel posts the preview URL on this PR. Paste it here and say what you checked on it. -->

## Self-review
- [ ] I read the whole diff line by line and can explain every change
- [ ] Nothing unrelated, generated or left over (debug code, commented-out code) slipped in

## Checklist
- [ ] `npm test`, `npm run lint`, `npm run build` pass in `client/`
- [ ] Database change? Migration + tests in `supabase/`, `scripts/db-test.sh` passes, applied to production, file renamed to the recorded version
- [ ] No secrets in code or `VITE_*` variables
- [ ] `CLAUDE.md` / READMEs updated if architecture, commands or rules changed
- [ ] Checked the live site after deploy
