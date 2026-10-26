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
- Redação Lab with official, authorial, and student-created topics, autosaved drafts, a writing timer, TXT/PDF export, and a competency guide referencing the INEP 2026 participant handbook.
- Locally stored personal topic import/export (versioned JSON), personal question explanations, favorites, and "Quero revisar" markers.
- Review Build sessions assembled from missed, favorited, or personally annotated questions. Session answers are not added to the main history and grant no XP.
- Responsive navigation and an About page, built for Web and native devices.

Questions and their associated content depend on the external API and may be
incomplete or temporarily unavailable. The app validates question data before
allowing an answer. The ENEM.DEV app is independent and is not affiliated with
INEP or MEC.

Redação Lab stores essays locally on the current device using AsyncStorage.
Topics are maintained in `src/services/writing-topic-catalog.ts`; official
topics should only be added with a verified year and source, and original
practice proposals should be labeled authorial.

Student-created writing topics are stored separately from the distributed
catalog. Their JSON import/export format is versioned and limited to 100 KB.
Custom topics can attach up to 10 supporting-text images (3 per text, 3 MB
each). Image files are kept outside AsyncStorage: in the app's persistent
document directory on Android and in IndexedDB on Web. Topic JSON exports omit
image files; images remain local to the original device. Essays retain a
snapshot of their topic so deleting a personal topic does not remove its
identifying information or referenced images. TXT and PDF essay exports include
the topic and export date; Web PDF export uses the browser print dialog, while
Android shares a generated PDF file. Personal question notes and Review Build
state do not modify the manual explanation catalog, answer history, Debug Mode,
or XP.

Essay word counts are for personal reference and do not represent the ENEM
official answer-sheet line limit. The competency checklist is a personal
revision aid, not an official correction or score. Redações do not grant XP or
affect Daily Commit.

## Comentários das questões

As resoluções são conteúdo local, mantido em
`src/services/question-explanation-catalog.ts`. Para adicionar uma, use como
chave o mesmo identificador do progresso: `ano:número` ou
`ano:número:idioma` quando o idioma fizer parte da questão. Preencha
`questionId` com a mesma chave e informe `reviewStatus` como `unreviewed`,
`reviewed` ou `validated`. `general`, os comentários por alternativa (`A` a
`E`) e `source` são opcionais. Cadastre somente explicações com conteúdo
verificável e fonte editorial apropriada; o catálogo começa vazio e a
indisponibilidade de uma explicação não impede responder nem avançar.

The API's source repository is available at
[github.com/yunger7/enem-api](https://github.com/yunger7/enem-api). This project
does not currently declare a public repository URL.
