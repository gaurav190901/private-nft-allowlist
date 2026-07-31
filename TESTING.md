# Verification checklist

The executable suite is `src/test/allowlist.test.ts`.

```bash
npm test
npm run compile
npm run build
```

Five passing scenarios cover initialization, root updates, a valid Merkle claim, an invalid proof path, and duplicate-claim/nullifier protection. The tests prove that membership can be checked privately without publishing the allowlist itself.

CI runs the contract and frontend verification jobs on every push and pull request.
