#!/usr/bin/env python3
"""Fetch replacement covers for imported books from Open Library."""

import argparse
import json
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
BOOKS_DIR = REPO_ROOT / "books"
DEFAULT_COVER = REPO_ROOT / "graphics" / "book.jpg"
USER_AGENT = (
	"The Hypertextual Library cover fetcher "
	"(low-volume public-domain imports; https://hypertextlibrary.com)"
)
SEARCH_URL = "https://openlibrary.org/search.json"
COVER_URL = "https://covers.openlibrary.org/b/id/{cover_id}-L.jpg?default=false"
TITLE_STOP_PHRASES = [
	":",
	";",
	" in Prose",
]


def read_json(path):
	with path.open("r", encoding="utf-8") as infile:
		return json.load(infile)


def write_json(path, data):
	path.write_text(
		json.dumps(data, indent="\t", ensure_ascii=False) + "\n",
		encoding="utf-8",
	)


def file_sha1(path):
	import hashlib

	digest = hashlib.sha1()
	with path.open("rb") as infile:
		for chunk in iter(lambda: infile.read(1024 * 64), b""):
			digest.update(chunk)
	return digest.hexdigest()


def request_url(url, timeout):
	request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
	with urllib.request.urlopen(request, timeout=timeout) as response:
		return response.headers, response.read()


def title_variants(title):
	variants = [title]
	for marker in TITLE_STOP_PHRASES:
		if marker in title:
			variants.append(title.split(marker, 1)[0].strip())
	seen = set()
	for variant in variants:
		if variant and variant.lower() not in seen:
			seen.add(variant.lower())
			yield variant


def author_variants(author):
	variants = [author]
	if " and " in author:
		variants.append(author.split(" and ", 1)[0].strip())
	seen = set()
	for variant in variants:
		if variant and variant.lower() not in seen:
			seen.add(variant.lower())
			yield variant


def search_openlibrary_once(title, author, timeout):
	params = urllib.parse.urlencode(
		{
			"title": title,
			"author": author,
			"limit": 10,
			"fields": "key,title,author_name,cover_i,edition_key",
		}
	)
	headers, body = request_url("%s?%s" % (SEARCH_URL, params), timeout)
	charset = headers.get_content_charset() or "utf-8"
	data = json.loads(body.decode(charset, errors="replace"))
	for doc in data.get("docs", []):
		if doc.get("cover_i"):
			return doc
	return None


def search_openlibrary(title, author, timeout):
	for title_variant in title_variants(title):
		for author_variant in author_variants(author):
			doc = search_openlibrary_once(title_variant, author_variant, timeout)
			if doc:
				return doc
	return None


def imported_book_dirs(slugs):
	if slugs:
		for slug in slugs:
			yield BOOKS_DIR / slug
		return

	for source_path in sorted(BOOKS_DIR.glob("*/source.json")):
		yield source_path.parent


def should_replace_cover(book_dir, default_hash, force):
	cover_path = book_dir / "cover.jpg"
	if force:
		return True
	if not cover_path.is_file():
		return True
	return file_sha1(cover_path) == default_hash


def update_source_metadata(book_dir, source_url, openlibrary_work_url):
	source_path = book_dir / "source.json"
	if not source_path.is_file():
		return
	metadata = read_json(source_path)
	metadata["cover"] = {
		"name": "Open Library Covers API",
		"source_url": source_url,
		"work_url": openlibrary_work_url,
	}
	write_json(source_path, metadata)


def fetch_cover(book_dir, timeout):
	metadata = read_json(book_dir / "source.json")
	title = metadata["title"]
	author = metadata["author"]
	doc = search_openlibrary(title, author, timeout)
	if not doc:
		return None

	cover_id = doc["cover_i"]
	cover_url = COVER_URL.format(cover_id=cover_id)
	headers, image = request_url(cover_url, timeout)
	content_type = headers.get("Content-Type", "")
	if not content_type.startswith("image/"):
		raise RuntimeError("Open Library did not return an image for %s" % title)

	(book_dir / "cover.jpg").write_bytes(image)
	return {
		"title": title,
		"cover_url": cover_url,
		"work_url": "https://openlibrary.org%s" % doc.get("key", ""),
	}


def parse_args():
	parser = argparse.ArgumentParser(
		description="Replace generic imported covers with Open Library cover images."
	)
	parser.add_argument(
		"slugs",
		nargs="*",
		help="Optional book slugs. Defaults to every book with source.json.",
	)
	parser.add_argument(
		"--force",
		action="store_true",
		help="Replace existing non-generic cover.jpg files too.",
	)
	parser.add_argument(
		"--dry-run",
		action="store_true",
		help="Search and report matches without writing images.",
	)
	parser.add_argument(
		"--delay",
		type=float,
		default=1.1,
		help="Seconds to wait between books.",
	)
	parser.add_argument(
		"--timeout",
		type=float,
		default=30.0,
		help="Network timeout in seconds.",
	)
	return parser.parse_args()


def main():
	args = parse_args()
	default_hash = file_sha1(DEFAULT_COVER)
	fetched = []
	skipped = []
	missing = []

	for book_dir in imported_book_dirs(args.slugs):
		source_path = book_dir / "source.json"
		if not source_path.is_file():
			missing.append("%s has no source.json" % book_dir.relative_to(REPO_ROOT))
			continue
		if not should_replace_cover(book_dir, default_hash, args.force):
			skipped.append("%s already has a custom cover" % book_dir.name)
			continue

		try:
			result = fetch_cover(book_dir, args.timeout)
		except Exception as error:
			missing.append("%s: %s" % (book_dir.name, error))
			result = None

		if result:
			if args.dry_run:
				shutil.copyfile(DEFAULT_COVER, book_dir / "cover.jpg")
			else:
				update_source_metadata(
					book_dir,
					result["cover_url"],
					result["work_url"],
				)
			fetched.append("%s -> %s" % (book_dir.name, result["cover_url"]))
		else:
			missing.append("%s: no cover match" % book_dir.name)

		if args.delay > 0:
			time.sleep(args.delay)

	for line in fetched:
		print("Fetched %s" % line)
	for line in skipped:
		print("Skipped %s" % line)
	for line in missing:
		print("Missing %s" % line)

	if missing:
		raise SystemExit(1)


if __name__ == "__main__":
	main()
