'use strict'

var old_search = null;
var row_size = 4;


// returns true if every part of the search matches
// either a word in the title or the author's name
function book_matches_search(book, search)
{
	// the parts of the search
	var parts = search.toLowerCase().split(" ")

	for (var i = 0; i < parts.length; ++i) {

		// check for a mismatch to sieve it out
		if (book.title.toLowerCase().indexOf(parts[i]) < 0 && 
			book.author.toLowerCase().indexOf(parts[i]) < 0) 
		{
			return false;
		}
	}

	// pass
	return true;
}

function reload_book_list(search)
{
	var book_list_html = $("#book-list");

	var new_html = "<div class=\"row\"><div class=\"row-height\">";

	var count = 0
	book_list.forEach(function (book) {

		if (book_matches_search(book, search)) {

			if (count && count % row_size == 0) {
				new_html += "</div></div><div class=\"row\"><div class=\"row-height\">";
			}

			count += 1;

			new_html += book.html;

		}
	});

	new_html += "</div></div>";

	book_list_html.html(new_html);

}

// notate every keypress
$(document).on("input", function (e) {
    var new_search = $("#search-box").val();
    if (old_search === new_search) return; 
    old_search = new_search;
    reload_book_list(new_search);
});
