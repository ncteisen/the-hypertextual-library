import sys
import json
import os
import shutil
import html as html_lib

SOURCE_BOOKS_DIR = "books"

# this will build the html that makes up the library of books
library_book_elt_html_template = """<article class="book-card book" data-book-title="{title}" data-author="{author}" data-uniquename="{uniquename}">
    <a class="book-card__link" href="{uniquename}/">
        <span class="book-card__cover-wrap">
            <img class="book-card__cover" src="{picture}" alt="Cover for {title}" loading="lazy">
        </span>
        <span class="book-card__meta">
            <span class="book-card__title">{title}</span>
            <span class="book-card__author">{author}</span>
        </span>
    </a>
</article>
"""

# given a phrase, makes it linked so that it is clickable
# to beused when creating html pages for each book
def linkify(phrase):
	return " ".join(
		"<a class=\"word\" href=\"#\">%s</a>" % html_lib.escape(word)
		for word in phrase.split(" ")
	)

# returns a string in the form:
#    lastname firstname title
# to be used for sorting the books
def book_sort_string(book):
	author = book["author"].split()
	author_str = ""
	if len(author) > 1:
		author_str += " ".join(author[1:])
		author_str += " " + author[0]
	author_str += " " + book["title"]
	return author_str

# per book html template
html_template = open("template/template.html", "r").read()
js_text_file_template = open("template/raw_text.js", "r").read()


# json objects of all the books
data = open("data.json", "r").read()
data = json.loads(data)

# sort the books by author, then title
books = sorted(data["books"], key = book_sort_string)

book_list_html = ""
for i, book in enumerate(books):

	uniquename = book["uniquename"]
	title_text = html_lib.escape(book["title"])
	author_text = html_lib.escape(book["author"])

	source_bookdir = "%s/%s" % (SOURCE_BOOKS_DIR, uniquename)
	output_bookdir = uniquename

	# validate all the info
	if (not os.path.isdir(source_bookdir)):
		sys.stderr.write("Error: no directory named %s -- Site won't be generated\n" % source_bookdir)
		continue;

	tfile = "%s/text.txt" % (source_bookdir)
	if (not os.path.isfile(tfile)):
		sys.stderr.write("Error: no file %s -- Site won't be generated\n" % tfile)
		continue;

	pfile = "%s/cover.jpg" % (source_bookdir)
	if (not os.path.isfile(pfile)):
		sys.stderr.write("Error: no file %s -- Site won't be generated\n" % pfile)
		continue;

	if (not os.path.isdir(output_bookdir)):
		os.makedirs(output_bookdir)

	# this will be where we write the generated index file per book
	html_outfile_name = "%s/index.html" % output_bookdir
	html_outfile = open(html_outfile_name, "w")

	# linkified, so the titles are clickable
	title = linkify(book["title"])
	author = linkify(book["author"])

	# creation of the per book html page
	html = html_template.format(
		title = title,
		author = author,
		asset_prefix = "../",
		library_href = "../",
		cover_src = "cover.jpg"
	)

	html_outfile.write(html)

	# this will be the js file that holds all the text
	raw_text_file_name = "%s/%s/text.txt" % (SOURCE_BOOKS_DIR, uniquename)
	raw_text_file = open(raw_text_file_name, "r")
	raw_text = raw_text_file.read()

	js_text = js_text_file_template.format(text = raw_text)

	js_text_outfile_name = "%s/raw_text.js" % (output_bookdir)
	js_text_outfile = open(js_text_outfile_name, "w")

	js_text_outfile.write(js_text)

	shutil.copyfile(pfile, "%s/cover.jpg" % output_bookdir)

	# constructing the library html
	library_book_elt_html = library_book_elt_html_template.format(
		uniquename = uniquename,
		title = title_text,
		author = author_text,
		picture = "%s/cover.jpg" % uniquename
	)

	book_list_html += library_book_elt_html
	book["html"] = library_book_elt_html

# make the index for the library
library = open("template/library.html", "r").read()
book_outfile = open("index.html", "w")

book_outfile.write(library.format(book_list=book_list_html, type="books", asset_prefix=""))

books_redirect_outfile = open("books/index.html", "w")
books_redirect_outfile.write("""<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="refresh" content="0; url=../">
        <title>The Hypertext Library</title>
        <link rel="canonical" href="../">
        <script>
            window.location.replace("../");
        </script>
    </head>
    <body>
        <p><a href="../">Go to The Hypertext Library</a></p>
    </body>
</html>
""")

# create a file to be used by the index.js file
books_js_file = open("js/books.js", "w")
books_js_file.write("book_list = ")
books_js_file.write(json.dumps(books))
