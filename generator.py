import sys
import json
import os

book_list_template = """
<div class="col-md-3 col-height">
    <a href="{uniquename}/">
        <div class="pic-wrapper">
            <img src="{picture}" class="img-rounded pic" width="175" height="250">
            <br>
            <p class="regular text-center">{title} - {author}</p>
        </div>
    </a>
</div>
"""

drowpdown_template = "<li><a href=\"{uniquename}\">{title} - {author}</a></li>"

def linkify(phrase):
	phrase = phrase.split(" ")
	res = "<a class=\"word\">"
	for word in phrase:
		res += word + "</a> <a class=\"word\">"
	res += "</a>"
	return res

# html template
template = open("template/template.html", "r").read()


# json objects of all the books
books = open("books.json", "r").read()
books = json.loads(books)

book_dropdown_html = ""
book_list_html = ""

count = 0
col_per_row = 4
for book in books["books"]:

	uniquename = book["uniquename"]

	# validate all the info
	if (not os.path.isdir(uniquename)):
		sys.stderr.write("Error: no directory named %s -- Site won't be generated\n" % uniquename)
		continue;

	tfile = "%s/%s_text.js" % (uniquename, uniquename)
	if (not os.path.isfile(tfile)):
		sys.stderr.write("Error: no file %s -- Site won't be generated\n" % tfile)
		continue;

	pfile = "%s/%s.jpg" % (uniquename, uniquename)
	if (not os.path.isfile(pfile)):
		sys.stderr.write("Error: no file %s -- Site won't be generated\n" % pfile)
		continue;

	outfname = "%s/index.html" % uniquename
	outfile = open(outfname, "w")

	title = linkify(book["title"])
	author = linkify(book["author"])

	html = template.format(
		title = title,
		author = author,
		raw_text_file = "%s_text.js" % uniquename,
		title_picture = "%s.jpg" % uniquename
	)

	outfile.write(html)

	list_elt = book_list_template.format(
		uniquename = uniquename,
		title = book["title"],
		author = book["author"],
		picture = "%s/%s.jpg" % (uniquename, uniquename)
	)

	dropdown_elt = drowpdown_template.format(
		uniquename = uniquename,
		title = book["title"],
		author = book["author"],
	)

	if count and count % col_per_row == 0:
		book_list_html += "</div></div><div class=\"row\"><div class=\"row-height\">"

	count += 1

	book_list_html += list_elt
	book_dropdown_html += dropdown_elt

# make the index for the library
library = open("template/library.html", "r").read()
outfile = open("index.html", "w")

outfile.write(library.format(dropdown=book_dropdown_html, book_list=book_list_html))