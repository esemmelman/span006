# Spanish reflexive verbs

Ten large-print English sentences with buttons that speak their Spanish translations. Open `index.html` in a browser. No installation or build is required.

Audio uses the browser's speech synthesis and available Spanish voices. Each new selection stops the previous sentence.

Select Next after sentence 10 for shuffled speaking practice. Record a Spanish answer, then select Stop to receive a word-match percentage and recognized transcript. Answers and speed sliders are hidden in this mode. Back to practice returns to the listening page.

Recording uses browser speech recognition and requires microphone permission and a supported browser. The browser may send audio to its speech recognition service. This app does not save recordings. Scores compare recognized words using word edit distance, ignoring capitalization, punctuation, accents, optional matching subject pronouns, and numeric forms of seven and ten. Scores are wording comparisons, not pronunciation grades; other valid translations can score lower.

Run checks with `node --test practice.test.cjs`.
