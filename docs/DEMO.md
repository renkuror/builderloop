# Demo

Run the local verification flow:

```bash
pnpm run ci
pnpm evidence
node cli/builderloop.js campaign-hash
node cli/builderloop.js issue-module
pnpm frontend:build
```

Open `dist/web/index.html` after `pnpm frontend:build` to inspect the three required MVP screens: Campaign, Progress, and Reward.
