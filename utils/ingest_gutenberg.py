#!/usr/bin/env python3
"""Import a Project Gutenberg plain-text work into the local book layout."""

import argparse
import datetime as dt
import json
import re
import shutil
import sys
import textwrap
import time
import urllib.error
import urllib.request
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CANDIDATES_FILE = REPO_ROOT / "ingestion_candidates.json"
DEFAULT_COVER = REPO_ROOT / "graphics" / "book.jpg"
DEFAULT_LINE_WIDTH = 73
GUTENBERG_LICENSE_URL = "https://www.gutenberg.org/policy/license"
USER_AGENT = (
	"The Hypertextual Library ingestion tool "
	"(manual one-work imports; https://hypertextlibrary.com)"
)

START_RE = re.compile(
	r"^\s*\*{3}\s*START OF (?:THE )?PROJECT GUTENBERG EBOOK.*\*{3}\s*$",
	re.IGNORECASE,
)
END_RE = re.compile(
	r"^\s*\*{3}\s*END OF (?:THE )?PROJECT GUTENBERG EBOOK.*\*{3}\s*$",
	re.IGNORECASE,
)
HEADING_RE = re.compile(
	"^(chapter|book|part|volume|letter|stave)(?:\\s+|[.:\\-\\u2014\\u2013]+|$)(.*)$",
	re.IGNORECASE,
)
SHORT_FRONT_MATTER_RE = re.compile(
	r"^(?:the\s+)?(preface|prologue|epilogue|introduction|contents)$",
	re.IGNORECASE,
)
HEADING_NUMBER_RE = re.compile(
	r"^(?:[ivxlcdm]+|\d+|one|two|three|four|five|six|seven|eight|nine|ten|"
	r"eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|"
	r"nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b",
	re.IGNORECASE,
)


def load_candidates(path):
	with path.open("r", encoding="utf-8") as infile:
		data = json.load(infile)
	return data.get("works", [])


def find_candidate(works, key):
	key = str(key).strip().lower()
	for work in works:
		values = [
			str(work.get("gutenberg_ebook_id", "")).lower(),
			work.get("uniquename", "").lower(),
			work.get("title", "").lower(),
		]
		if key in values:
			return work
	return None


def slugify(value):
	value = value.lower()
	value = re.sub(r"[^a-z0-9]+", "_", value)
	value = re.sub(r"_+", "_", value).strip("_")
	return value


def gutenberg_text_url(ebook_id):
	return "https://www.gutenberg.org/ebooks/%s.txt.utf-8" % ebook_id


def download_text(url, delay, timeout):
	if delay > 0:
		time.sleep(delay)
	request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
	try:
		with urllib.request.urlopen(request, timeout=timeout) as response:
			content_type = response.headers.get_content_charset() or "utf-8"
			return response.read().decode(content_type, errors="replace")
	except urllib.error.URLError as error:
		raise SystemExit("Could not download %s: %s" % (url, error)) from error


def read_source_text(args, source_url):
	if args.source_file:
		return args.source_file.read_text(encoding="utf-8")
	if not source_url:
		raise SystemExit("Provide --source-url, --id, or a candidate slug.")
	return download_text(source_url, args.delay, args.timeout)


def strip_gutenberg_boilerplate(text):
	lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")

	start_index = None
	for index, line in enumerate(lines):
		if START_RE.match(line):
			start_index = index + 1
			break
	if start_index is None:
		start_index = 0

	end_index = len(lines)
	for index in range(start_index, len(lines)):
		if END_RE.match(lines[index]):
			end_index = index
			break

	return "\n".join(lines[start_index:end_index]).strip()


def apply_optional_trim(text, start_regex, end_regex):
	lines = text.split("\n")

	if start_regex:
		pattern = re.compile(start_regex, re.IGNORECASE)
		for index, line in enumerate(lines):
			if pattern.search(line):
				lines = lines[index:]
				break
		else:
			raise SystemExit("--start-regex did not match any line.")

	if end_regex:
		pattern = re.compile(end_regex, re.IGNORECASE)
		for index, line in enumerate(lines):
			if pattern.search(line):
				lines = lines[:index]
				break
		else:
			raise SystemExit("--end-regex did not match any line.")

	return "\n".join(lines).strip()


def looks_like_heading(line, previous_line, next_line):
	stripped = line.strip()
	if not stripped:
		return False
	if stripped.startswith("--------") and stripped.endswith("--------"):
		return True
	if len(stripped) > 95:
		return False

	previous_blank = not previous_line.strip()
	next_blank = not next_line.strip()
	if not (previous_blank or next_blank):
		return False

	if SHORT_FRONT_MATTER_RE.match(stripped):
		return True
	match = HEADING_RE.match(stripped)
	if match and HEADING_NUMBER_RE.match(match.group(2).strip()):
		return True
	return False


def normalize_heading(line):
	stripped = re.sub(r"\s+", " ", line.strip())
	stripped = stripped.strip("*_")
	stripped = stripped.strip()
	if stripped.startswith("--------") and stripped.endswith("--------"):
		return stripped
	return "-------- %s --------" % stripped


def normalize_chapter_headings(text):
	lines = text.split("\n")
	out = []
	for index, line in enumerate(lines):
		previous_line = lines[index - 1] if index > 0 else ""
		next_line = lines[index + 1] if index + 1 < len(lines) else ""
		if looks_like_heading(line, previous_line, next_line):
			if out and out[-1].strip():
				out.append("")
			out.append(normalize_heading(line))
			continue
		out.append(line.rstrip())
	return "\n".join(out).strip()


def wrap_text(text, width):
	out = []
	for line in text.split("\n"):
		stripped = line.strip()
		if not stripped:
			out.append("")
		elif stripped.startswith("--------") and stripped.endswith("--------"):
			out.append(stripped)
		elif len(line) <= width:
			out.append(line.rstrip())
		else:
			wrapped = textwrap.wrap(
				line,
				width=width,
				break_long_words=False,
				break_on_hyphens=False,
				replace_whitespace=False,
				drop_whitespace=True,
			)
			out.extend(wrapped or [""])
	return "\n".join(out).strip() + "\n"


def collect_warnings(text, line_width):
	warnings = []
	if "`" in text:
		warnings.append(
			"Text contains backticks, which can break template/raw_text.js String.raw output."
		)
	if "{text}" in text:
		warnings.append("Text contains the literal string {text}; verify generated raw_text.js.")
	long_lines = [
		line
		for line in text.split("\n")
		if len(line) > line_width + 10
		and not (line.startswith("--------") and line.endswith("--------"))
	]
	if long_lines:
		warnings.append("%s lines are still longer than expected." % len(long_lines))
	if "PROJECT GUTENBERG" in text.upper():
		warnings.append("Project Gutenberg boilerplate may still be present.")
	return warnings


def write_source_metadata(book_dir, work, source_url, line_width, warnings):
	now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
	metadata = {
		"title": work["title"],
		"author": work["author"],
		"uniquename": work["uniquename"],
		"source": {
			"name": "Project Gutenberg",
			"ebook_id": work.get("gutenberg_ebook_id"),
			"ebook_url": work.get("ebook_url"),
			"plain_text_url": source_url,
			"license_url": GUTENBERG_LICENSE_URL,
			"copyright_status": work.get(
				"copyright_status",
				"Public domain in the USA; verify jurisdiction before redistribution.",
			),
			"downloaded_at": now,
		},
		"ingestion": {
			"script": "utils/ingest_gutenberg.py",
			"line_width": line_width,
			"review_status": "needs_human_review",
			"warnings": warnings,
		},
	}
	if work.get("translator"):
		metadata["translator"] = work["translator"]
	(book_dir / "source.json").write_text(
		json.dumps(metadata, indent="\t", ensure_ascii=False) + "\n",
		encoding="utf-8",
	)


def update_data_json(work):
	data_path = REPO_ROOT / "data.json"
	with data_path.open("r", encoding="utf-8") as infile:
		data = json.load(infile)

	for existing in data.get("books", []):
		if existing.get("uniquename") == work["uniquename"]:
			raise SystemExit("%s is already listed in data.json." % work["uniquename"])

	data.setdefault("books", []).append(
		{
			"title": work["title"],
			"author": work["author"],
			"uniquename": work["uniquename"],
		}
	)
	data_path.write_text(
		json.dumps(data, indent="\t", ensure_ascii=False) + "\n",
		encoding="utf-8",
	)


def list_candidates(path):
	works = load_candidates(path)
	for work in works:
		print(
			"{uniquename:24} #{gutenberg_ebook_id:<6} {title} -- {author}".format(
				**work
			)
		)


def build_work(args, candidate):
	work = dict(candidate or {})
	if args.id:
		work["gutenberg_ebook_id"] = args.id
	if args.title:
		work["title"] = args.title
	if args.author:
		work["author"] = args.author
	if args.translator:
		work["translator"] = args.translator
	if args.uniquename:
		work["uniquename"] = args.uniquename

	if "title" not in work or "author" not in work:
		raise SystemExit("Provide --title and --author, or use a candidate slug.")
	if "uniquename" not in work:
		work["uniquename"] = slugify(work["title"])
	if "gutenberg_ebook_id" in work:
		work.setdefault(
			"ebook_url",
			"https://www.gutenberg.org/ebooks/%s" % work["gutenberg_ebook_id"],
		)
		work.setdefault("plain_text_url", gutenberg_text_url(work["gutenberg_ebook_id"]))
	return work


def parse_args():
	parser = argparse.ArgumentParser(
		description=(
			"Download or read a Project Gutenberg UTF-8 text, strip boilerplate, "
			"normalize headings, wrap lines, and create books/<uniquename>/."
		)
	)
	parser.add_argument(
		"candidate",
		nargs="?",
		help="Candidate uniquename/title or Gutenberg ebook id from ingestion_candidates.json.",
	)
	parser.add_argument("--id", type=int, help="Project Gutenberg ebook id.")
	parser.add_argument("--title", help="Work title.")
	parser.add_argument("--author", help="Work author.")
	parser.add_argument("--translator", help="Translator for source metadata.")
	parser.add_argument("--uniquename", help="Directory-safe book identifier.")
	parser.add_argument("--source-url", help="Plain-text source URL.")
	parser.add_argument("--source-file", type=Path, help="Local UTF-8 text file to import.")
	parser.add_argument(
		"--candidates-file",
		type=Path,
		default=DEFAULT_CANDIDATES_FILE,
		help="Candidate manifest path.",
	)
	parser.add_argument(
		"--list-candidates",
		action="store_true",
		help="Print importable candidate slugs and exit.",
	)
	parser.add_argument(
		"--line-width",
		type=int,
		default=DEFAULT_LINE_WIDTH,
		help="Maximum line width for text.txt wrapping.",
	)
	parser.add_argument(
		"--delay",
		type=float,
		default=2.0,
		help="Seconds to wait before downloading, for polite one-off use.",
	)
	parser.add_argument(
		"--timeout",
		type=float,
		default=30.0,
		help="Network timeout in seconds for a single text download.",
	)
	parser.add_argument(
		"--keep-gutenberg-boilerplate",
		action="store_true",
		help="Keep Project Gutenberg header and footer text.",
	)
	parser.add_argument(
		"--start-regex",
		help="Trim everything before the first line matching this regex.",
	)
	parser.add_argument(
		"--end-regex",
		help="Trim everything from the first line matching this regex onward.",
	)
	parser.add_argument(
		"--write-data",
		action="store_true",
		help="Append the work to data.json after creating book files.",
	)
	parser.add_argument(
		"--data-only",
		action="store_true",
		help="Append an already reviewed import to data.json without rewriting files.",
	)
	parser.add_argument(
		"--force",
		action="store_true",
		help="Overwrite an existing books/<uniquename>/text.txt and source.json.",
	)
	parser.add_argument(
		"--dry-run",
		action="store_true",
		help="Process the source and print a summary without writing files.",
	)
	return parser.parse_args()


def main():
	args = parse_args()

	if args.list_candidates:
		list_candidates(args.candidates_file)
		return

	works = load_candidates(args.candidates_file)
	candidate = None
	if args.candidate:
		candidate = find_candidate(works, args.candidate)
		if candidate is None and args.candidate.isdigit():
			args.id = int(args.candidate)
		elif candidate is None:
			raise SystemExit("No candidate found for %r." % args.candidate)

	work = build_work(args, candidate)
	source_url = args.source_url or work.get("plain_text_url")
	book_dir = REPO_ROOT / "books" / work["uniquename"]

	if args.data_only:
		required_paths = [book_dir / "text.txt", book_dir / "cover.jpg", book_dir / "source.json"]
		missing_paths = [path for path in required_paths if not path.is_file()]
		if missing_paths:
			for path in missing_paths:
				print("Missing %s" % path.relative_to(REPO_ROOT), file=sys.stderr)
			raise SystemExit("Cannot add %s to data.json yet." % work["uniquename"])
		update_data_json(work)
		print("Added %s to data.json" % work["title"])
		return

	if book_dir.exists() and not args.force and not args.dry_run:
		raise SystemExit("%s already exists. Use --force to overwrite import files." % book_dir)

	text = read_source_text(args, source_url)
	if not args.keep_gutenberg_boilerplate:
		text = strip_gutenberg_boilerplate(text)
	text = apply_optional_trim(text, args.start_regex, args.end_regex)
	text = normalize_chapter_headings(text)
	text = wrap_text(text, args.line_width)
	warnings = collect_warnings(text, args.line_width)

	if args.dry_run:
		heading_count = sum(
			1
			for line in text.split("\n")
			if line.startswith("--------") and line.endswith("--------")
		)
		print("Dry run for %s" % work["title"])
		print("Target directory: %s" % book_dir.relative_to(REPO_ROOT))
		print("Lines: %s" % len(text.split("\n")))
		print("Detected headings: %s" % heading_count)
		if warnings:
			print("Warnings:")
			for warning in warnings:
				print("- %s" % warning)
		return

	book_dir.mkdir(parents=True, exist_ok=True)
	(book_dir / "text.txt").write_text(text, encoding="utf-8")
	if DEFAULT_COVER.exists() and not (book_dir / "cover.jpg").exists():
		shutil.copyfile(DEFAULT_COVER, book_dir / "cover.jpg")
	write_source_metadata(book_dir, work, source_url, args.line_width, warnings)

	if args.write_data:
		update_data_json(work)

	print("Imported %s to %s" % (work["title"], book_dir.relative_to(REPO_ROOT)))
	print("Review %s before generating the site." % (book_dir / "text.txt").relative_to(REPO_ROOT))
	if warnings:
		print("Warnings:")
		for warning in warnings:
			print("- %s" % warning)
	if not args.write_data:
		print("Run again with --data-only after review to add it to data.json.")


if __name__ == "__main__":
	main()
