# Recap Development Guide

```bash
npm install      # install dependencies
npm run dev      # webpack watch mode
npm run build    # production bundle in dist/
```

Load `dist/` in `chrome://extensions` with Developer mode on, and click the reload icon after each rebuild.

## Main source files

```text
src/popup.jsx
src/popup.html
src/background.js
public/manifest.json
```

## Contributing

1. Fork the repository and create a branch.
2. Make your change and confirm `npm run build` succeeds.
3. Open a pull request describing what changed and why.

Details: [architecture](architecture.md). Report bugs at [GitHub Issues](https://github.com/anshukumar2932/Recap/issues).
