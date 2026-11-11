# Self-hosted fonts (KINETIC-PREP, CTE 2026-11-10)

Ember (pinned main `2d59d7b`) ships no fonts, so devtool-dashboard self-hosts them. No npm package, no runtime CDN.

Source: [google/fonts](https://github.com/google/fonts) at commit `5bb28733cec313b63fbd415b574b5ae35c8aa8b8`.

| File | Upstream file | Instance |
| --- | --- | --- |
| bricolage-grotesque-{300,700,800}-latin.woff2 | ofl/bricolagegrotesque/BricolageGrotesque[opsz,wdth,wght].ttf | opsz 96, wdth 100, wght 300/700/800 |
| instrument-sans-{400,500,600}-latin.woff2 | ofl/instrumentsans/InstrumentSans[wdth,wght].ttf | wdth 100, wght 400/500/600 |
| ibm-plex-mono-400-latin.woff2 | ofl/ibmplexmono/IBMPlexMono-Regular.ttf | static |

Built with fontTools (varLib.instancer, then pyftsubset to the Google Fonts "latin" range:
U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD), all layout features kept, WOFF2 output.

Licenses: SIL Open Font License 1.1, copied unchanged from upstream as OFL-*.txt in this folder.
