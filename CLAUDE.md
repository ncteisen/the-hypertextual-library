# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Hypertextual Library is a static site that lets readers explore classic books hypertextually — clicking any word shows all its occurrences throughout the text. It's deployed to GitHub Pages at `hypertextlibrary.com`.

## Build Command

```bash
python3 utils/generator.py
```

This reads `data.json`, validates each book's files, and regenerates all HTML/JS from templates. Run this after any changes to `data.json`, `template/`, or when adding a new book.

## Adding a Book

1. Add an entry to `data.json` under `"books"` with `title`, `author`, and `uniquename`
2. Format the raw text (from Project Gutenberg):
   - Lines must be ≤75 chars: `python3 utils/wrap.py < raw.txt > wrapped.txt`
   - Chapter titles must be: `-------- Chapter Title --------`
3. Save formatted text as `books/<uniquename>/text.txt`
4. Add cover image as `books/<uniquename>/cover.jpg`
5. Run `python3 utils/generator.py`

## Architecture

**Build time (Python):** `utils/generator.py` fills `template/template.html` and `template/raw_text.js` for each book, producing per-book `books/<uniquename>/index.html` and `books/<uniquename>/raw_text.js`. It also generates `books/index.html` from `template/library.html`.

**Runtime (JavaScript):** Each book page loads its full text from `raw_text.js` (a single `raw_text` variable). The JS then:
- Splits text into 35-line pages, aligned to chapter boundaries
- Wraps every word in `<a class="word">` tags for click-to-search
- Uses 4 Web Workers (`multithread.js`) for non-blocking search
- Highlights results with `<mark class="searched-word">` tags
- Alt+click on a word triggers dictionary lookup

**Key files:**
- `data.json` — source of truth for all book metadata
- `template/` — HTML/JS templates used by the generator
- `js/` — shared frontend JS (search, pagination, theme toggle, workers)
- `css/` — light and dark theme stylesheets
