
'use strict'

// populate all globals
var current_top_line = 0;
var page_length = 35;
var current_query_regex = null;

// load up all the data structires we will need
var ulysses_line_array_dirty = ulysses_raw_text.split('\n');

// make the pageness work right. We will pad the end of every
// chapter so that the whitespace completes the page. This
// will prevent a chapter from starting mid page.
var ulysses_line_array = []
var line_count = 0;
var first = true;
ulysses_line_array_dirty.forEach(function (line, i) {

	// we don't need to do this for telemachus
	if (first && is_title(line)) {
		line_count++;
		first = false;
	}

	// we have stumpled upon a mid-page title
	else if (!first && is_title(line)) {

		// pad the rest of the page
		while (line_count < page_length) {
			ulysses_line_array.push("");
			line_count++;
		}

		// reset
		line_count = 0;

	}

	// normal line count
	else {
		line_count++;
		if (line_count == page_length) line_count = 0;
	}

	// add the line
	ulysses_line_array.push(line);
});


// populate chapter data with the title and top lineno
var chapters_array = []
ulysses_line_array.forEach(function (line, i) {
	if (is_title(line)) {
		var title = line.replace(/-/g,'')
		chapters_array.push({title:title, lineno:i - 1});
	}
});

// pad the last page of the book
var last_page_n = Math.floor(ulysses_line_array.length / page_length)
while (ulysses_line_array.length % page_length) {
	ulysses_line_array.push("")
}

// // make the inverted index
// var inverted_index = {}
// ulysses_line_array.forEach(function (line, i) {
// 	line.split(" ").forEach(function (dirty_word, j) {
// 		var word = dirty_word.replace(/^[.,"':!?()-]+|[.,"':!?()-]+$/g, "").toLowerCase();
// 		if (!inverted_index.hasOwnProperty(word)) {
// 			inverted_index[word] = [];
// 		}
// 		inverted_index[word].push({lineno:i, chap_index:lineno_to_chapter_index(i), pageno:lineno_to_pageno(i)});
// 	});
// });

// make the chapter dropdown menu
var dropdown = $(".dropdown-menu");
chapters_array.forEach(function (c, i) {
	dropdown.append("<li><a class=\"chapter-dropdown\" chapter-index=\"" + i + 
		"\" line-number-chapter=\"" + c.lineno + "\">" + c.title + "</a></li>");
});

// loads a full page starting from top_line, extending for page_length
// also handles changing the title, setting the pageno
function load_page(top_line) {

	// hide pagination for first page
	if (top_line <= 0) {
		$(".last").hide();
	}
	else {
		$(".last").show();
	}

	// set the correct chapter
	var chap_index = lineno_to_chapter_index(top_line);
	set_title(chapters_array[chap_index].title)

	// grab page
	var page = $("#page-text"); 

	// clear old page
	page.empty()

	// new page num
	$(".page_number").text(lineno_to_pageno(top_line))

	// determines if we are at the very last page
	if (Math.floor(top_line / page_length + 1) >= last_page_n) {
		$(".next").hide();
	}
	else {
		$(".next").show();
	}

	// build the new page
	for (var i = 0; i < page_length; ++i) {
		
		var line_array = ulysses_line_array[top_line + i].split(" ");
		var linked_line = "";

		for (var j = 0; j < line_array.length; ++j) {
			if (current_query_regex && current_query_regex.test(line_array[j])) {
				linked_line += "<a class=\"searched-word\">" + line_array[j] + "</a> "
			}
			else {
				linked_line += "<a class=\"page-word\">" + line_array[j] + "</a> "
			}
		}

		page.append(linked_line + "<br>");
	}

	// link up the words
	$(function () {
		$(".page-word").click(function(e) {
			var text = e.target.innerHTML.toLowerCase();
			perform_search(text);
		});
	});
}

// load the initial page
load_page(0)
set_title(chapters_array[0].title);

// hide these for now
$("#result-table").hide();
$("#result-table-header").hide();

function is_title(line) {
	return line.indexOf("--------") > -1
}

function set_title(title) {
	$("#chapter-title").text(title);
}

function load_chapter(chap_index) {
	current_top_line = chapters_array[chap_index].lineno;
	load_page(current_top_line)
}

// attatch function to every chapter dropdown
$(function() {
    $(".chapter-dropdown").click(function(e) {
    	var i = parseInt(e.target.attributes[1].value);
    	load_chapter(i);
    });
});

// attached function to the pagination button
$(function() {
	$(".next").click(function(e) {
		current_top_line += page_length;
		load_page(current_top_line);
	});
});

// attached function to the pagination button
$(function() {
	$(".last").click(function(e) {
		current_top_line -= page_length;
		load_page(current_top_line);
	});
});

// translates a line number to it's respective chapter index
function lineno_to_chapter_index(lineno) {
	for (var i = chapters_array.length - 1; i >= 0; --i) {
		if (chapters_array[i].lineno <= lineno) {
			return i;
		}
	}
}

function lineno_to_pageno(lineno) {
	return Math.floor(lineno / page_length + 1);
}

function pageno_to_top_line(pageno) {
	return (pageno - 1) * page_length;
}

function perform_search(dirty_query) {

	var query = dirty_query.replace(/^[.,"':!?()-]+|[.,"':!?()-]+$/g, "");

	if (! /\S/.test(query)) {
		return;
	}

	// hide the old stuff, show the new
	$("#search-img").hide();
	$("#result-table").show();
	$("#result-table-header").show();

	var st = $("#search-term");
	st.empty();
	st.append("<a class=\"new-word\">Showing</a> <a class=\"new-word\">results</a> <a class=\"new-word\">for</a>: <a class=\"new-word\">" + query + "</a>");

	var table_body = $("#table-body");

	// clear old table
	table_body.empty();

	// regex magic
	current_query_regex = new RegExp("\\b" + query + "\\b", "i")

	var count = 0;
	var table = "";
	ulysses_line_array.forEach(function (line, i) {
		if (current_query_regex.test(line)) {
			count++

			// get the title and pageno
			var chap_index = lineno_to_chapter_index(i);
			var title = chapters_array[chap_index].title
			var pageno = lineno_to_pageno(i);
			var line_array = line.split(" ");
			var linked_line = ""

			var line_array_length = line_array.length;
			for (var j = 0; j < line_array_length; ++j) {
				if (current_query_regex.test(line_array[j])) {
					linked_line += "<a class=\"searched-word\">" + line_array[j] + "</a> "
				}
				else {
					linked_line += "<a class=\"result-word\">" + line_array[j] + "</a> "
				}
			}

			// add the row
			table += 			"<tr>" +
	                                "<td class=\"col-xs-3 chapter\">" +
	                                	"<a class=\" result search-res-chapter\" chapter-index=\"" + chap_index + "\">" +
	                                    title +
	                                    "</a>" +
	                                "</td>" +
	                                "<td class=\"col-xs-3 line-number\">" +
	                                    "<a class=\"result\" page=\"" + pageno + "\">" +
	                                        i +
	                                    "</a>" +
	                                "</td>" +
	                                "<td class=\"col-xs-6 line\">" +
	                                    linked_line +
	                                "</td>" +
	                           "</tr>";

		}
	});

	// add table to DOM
	table_body.append(table)

	var occ = $("#occurences");
	occ.empty()
	occ.append("<a class=\"new-word\">" + count + "</a> <a class=\"new-word\">line</a> <a class=\"new-word\">occurences</a>");
	
	$("#search-box").val(query);

	// link up the words to their searches
	$(function () {
		$(".result-word").click(function(e) {
			var text = e.target.innerHTML.toLowerCase();
			perform_search(text);
		});
	});

	// link up the new words to their searches
	$(function () {
		$(".new-word").click(function(e) {
			var text = e.target.innerHTML.toLowerCase();
			perform_search(text);
		});
	});

	// link up the lines to lead to pages
	$(function() {
		$(".result").click(function(e) {
			var pageno = parseInt(e.target.attributes[1].value);
			var lineno = pageno_to_top_line(pageno);
			current_top_line = lineno;
			load_page(lineno);
		});
	});

	// link up the chapters
	$(function() {
		$(".search-res-chapter").click(function(e) {
	    	var i = parseInt(e.target.attributes[1].value);
	    	load_chapter(i);
		});
	});

	load_page(current_top_line);
}

// attatches func for when search is performed
$(function() {
	$("#search-btn").click(function (e) {
		e.preventDefault();
		var query = $("#search-box").val().toLowerCase();
		perform_search(query);
	});
});

// link up the words to their searches
$(function () {
	$(".word").click(function(e) {
		var text = e.target.innerHTML.toLowerCase();
		perform_search(text);
	});
});

// link up the words to their searches
$(function () {
	$(".link-word").click(function(e) {
		var text = e.target.innerHTML.toLowerCase();
		perform_search(text);
	});
});

