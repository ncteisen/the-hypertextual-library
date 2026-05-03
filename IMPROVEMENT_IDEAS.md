# Improvement And Feature Ideas

This tracker captures ideas from the codebase review on 2026-05-03. It is meant
to be a practical parking lot for reviving the project, not a binding roadmap.

## Completed Immediate Repairs

- Fixed documented build commands to use `python3 utils/generator.py`.
- Ported `utils/wrap.py` and `utils/chapterize.py` to Python 3.
- Removed the extra `>` after the dictionary script tag in
  `template/template.html`.
- Kept `js/index.js` tolerant of `director` metadata, even though the revived
  site is now books-only.
- Corrected the known visible spelling mistakes in footer copy and
  search-result labels.
- Removed stale `books/<uniquename>/<uniquename>_text.js` generated artifacts.
- Removed the missing `music/` destination and the movie destination.
- Reviewed the deployable content for US public-domain safety, removed the
  movie/script content, and removed the clearest book risks: `1984` and
  `Animal Farm`.

## Build And Repository Hygiene

- Add a tiny `Makefile` or script aliases for common tasks:
  `build`, `serve`, `check`, and `clean-generated`.
- Add a generated-file consistency check that runs the generator and fails if
  `git diff` changes.
- Add a JSON metadata validator for required fields, duplicate `uniquename`
  values, missing directories, missing `text.txt` or `script.txt`, missing
  covers, and suspiciously unwrapped lines.
- Add a lightweight HTML validation pass over generated pages.
- Replace old Python scripts with one maintained text-ingestion CLI that can
  wrap lines, normalize chapter headings, strip Gutenberg headers/footers, and
  report formatting warnings.
- Create a clear generated-artifact policy: either commit generated HTML/JS for
  GitHub Pages simplicity or move to a build-and-deploy workflow that publishes
  generated output.
- Consider moving all work metadata into richer structured fields: `type`,
  `source_url`, `publication_year`, `language`, `public_domain_notes`,
  `translator`, and `sort_author`.

## Reader Experience

- Make the work page responsive. The current two-column layout is difficult on
  small screens.
- Add adjustable font size, line height, and page length controls.
- Preserve reading state in the URL or local storage: current page, chapter,
  active query, and theme.
- Add keyboard shortcuts for next page, previous page, focus search, and closing
  overlays.
- Replace alert-based dictionary lookup with an inline popover or side panel.
- Improve search-result navigation so clicking a result scrolls/focuses the
  matching occurrence on the page.
- Add phrase search, exact-word search, case sensitivity, stemming/lemmatization,
  and regex-off-by-default advanced search.
- Show search summary stats: total matches, chapters containing matches, and
  match density by chapter.
- Add a reading progress indicator and chapter progress.
- Improve accessibility: semantic landmarks, button elements for actions,
  keyboard focus states, ARIA labels, and contrast checks for both themes.

## Hypertext And Analysis Features

- Add a concordance page for each work with all words sorted by frequency.
- Add stop-word filtering and meaningful-word frequency views.
- Add chapter-level word-frequency heatmaps.
- Add "nearby words" or collocation views for a selected term.
- Add cross-book search across the full library.
- Add side-by-side comparison of a word or phrase across two works.
- Add shareable links for searches and selected result lines.
- Add export options for search results as CSV or JSON.
- Add annotations or bookmarks stored locally in the browser.
- Add a graph view showing repeated words, chapters, and co-occurrences.

## Content And Library Growth

- Add more public-domain books with consistent source attribution.
- Add source URLs and edition notes for every existing text.
- Add content categories such as novels, essays, scripture, speeches, and
  letters.
- Keep the public site books-only unless the project scope changes later.
- Add cover-image provenance and replacement guidance.

## Technical Modernization Options

- Keep the no-build static architecture, but rewrite the generator and frontend
  in cleaner modern JavaScript/Python.
- Replace jQuery and Bootstrap 3 with small vanilla JS modules and modern CSS.
- Precompute indexes at build time so searches do not scan every line on every
  query.
- Store precomputed indexes in compressed JSON per work and lazy-load them.
- Use Web Workers intentionally with one stable worker script rather than Blob
  generation from function strings.
- Escape rendered text through DOM APIs instead of concatenating HTML strings.
- Split `js/book-page-search.js` into modules: text parsing, pagination, search,
  rendering, navigation, and preferences.
- Add a static-site deployment workflow for GitHub Pages.
- Consider a modern framework only if it materially improves maintainability;
  the project can stay charmingly static if the generator and runtime are made
  sturdier.

## Testing Ideas

- Add unit tests for the generator's sorting, validation, and output paths.
- Add unit tests for chapter detection, page padding, line-to-page conversion,
  and search matching.
- Add browser smoke tests for `/`, `/books/`, and one generated work page.
- Add visual regression screenshots for light and dark themes.
- Add fixture texts that include punctuation, apostrophes, hyphenation, empty
  lines, no chapters, and very long chapters.

## Bigger Product Ideas

- Let readers upload a local text file and explore it entirely in the browser.
- Add a public-domain import flow from Project Gutenberg URLs.
- Add curated reading paths or essays explaining interesting word networks.
- Add saved collections of searches for classroom use.
- Add "word trails" where a reader can move occurrence by occurrence through a
  text.
- Add an offline-first mode with service worker caching for selected works.
- Add multilingual text support and language-aware tokenization.
