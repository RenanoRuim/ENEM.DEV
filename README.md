# ENEM.DEV

ENEM.DEV is a responsive study dashboard for ENEM preparation, built with Expo,
React Native, TypeScript, and Expo Router. The existing Expo project is kept
cross-platform, with a sidebar on wide web screens and bottom tabs on smaller
screens and native devices.

## Run the app

```bash
npm install
npm run web
```

For native development, use `npm run android` or `npm run ios`.

## Features

- ENEM questions loaded from the community-maintained [ENEM.DEV API](https://api.enem.dev/), with year, subject, and language filters.
- Persistent answer history and question progress, including Debug Mode for reviewing missed questions.
- Performance indicators calculated from recorded answers.
- XP, levels, 25 categorized achievements with historical progress recognition, and Daily Commit progress.
- Responsive navigation and an About page, built for Web and native devices.

Questions and their associated content depend on the external API and may be
incomplete or temporarily unavailable. The app validates question data before
allowing an answer. The ENEM.DEV app is independent and is not affiliated with
INEP or MEC.

The API's source repository is available at
[github.com/yunger7/enem-api](https://github.com/yunger7/enem-api). This project
does not currently declare a public repository URL.
