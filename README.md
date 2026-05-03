# The Hypertext Library

The Hypertext Library is a static site for reading classic books
hypertextually. Every rendered word is clickable: click a word to search for
other occurrences throughout the book, or Alt+click to try the built-in
dictionary lookup.

The site is configured for GitHub Pages at
[hypertextlibrary.com](http://hypertextlibrary.com/).

## Build

Run the generator from the repository root:

```bash
python3 utils/generator.py
```

The generator reads `data.json`, validates each listed book's files, and
rewrites the generated library and book pages.

## Local Development

Serve the repository root as static files:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Source Files

- `data.json` stores the book metadata.
- `template/library.html` generates `books/index.html`.
- `template/template.html` generates each book's `index.html`.
- `template/raw_text.js` generates each book's `raw_text.js`.
- `books/<uniquename>/text.txt` stores the formatted source text for a book.
- `books/<uniquename>/cover.jpg` stores the book cover.
- `js/book-page-search.js` powers reader pagination, search, highlighting,
  chapter navigation, and dictionary lookup.
- `js/index.js` powers library-page filtering and theme toggling.
- `css/light.css` and `css/dark.css` are the reader themes.

## Generated Files

Do not hand-edit generated files unless you are intentionally inspecting output.
Edit the source files above and run `python3 utils/generator.py`.

Generated files include:

- `books/index.html`
- `js/books.js`
- `books/<uniquename>/index.html`
- `books/<uniquename>/raw_text.js`

## Adding A Book

1. Add an entry to `data.json` under `books` with `title`, `author`, and
   `uniquename`.
2. Create `books/<uniquename>/`.
3. Save formatted public-domain text as `books/<uniquename>/text.txt`.
4. Keep source text lines roughly 75 characters or shorter. You can wrap text
   with:

   ```bash
   python3 utils/wrap.py < raw.txt > books/<uniquename>/text.txt
   ```

5. Format chapter titles like this:

   ```text
   -------- Chapter Title --------
   ```

6. Add a cover image at `books/<uniquename>/cover.jpg`.
7. Run `python3 utils/generator.py`.
8. Test the generated page in a browser.

## Content Policy

Only add books that are safe to redistribute from this US-hosted GitHub Pages
site. Public-domain status is territorial, so verify the specific edition and
jurisdiction before adding or redeploying a text.

## Future Features

See `IMPROVEMENT_IDEAS.md` for the current revival roadmap and feature backlog.
