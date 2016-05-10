'use strict'
//debugger;

// function to attach to every single word on the page.
// will either trigger a lookup or a query
var word_click = function(e) {
		var text = e.target.innerHTML.toLowerCase();
		if (e.altKey) {
			lookup_word(text)
		}
		else {
			perform_search_wrapper(text);
		}
	}

// populate all globals
var current_top_line = 0;
var page_length = 35;
var current_linked_query_regex = null;
var lights_on = true;

// load up all the data structires we will need
var line_array_dirty = raw_text.split('\n');

// make the pageness work right. We will pad the end of every
// chapter so that the whitespace completes the page. This
// will prevent a chapter from starting mid page.
var line_array = []
var line_count = 0;
var first = true;
line_array_dirty.forEach(function (line, i) {

	// we don't need to do this for telemachus
	if (first && is_title(line)) {
		first = false;
	}

	// we have stumpled upon a mid-page title
	else if (!first && is_title(line)) {

		// pad the rest of the page
		while (line_count % page_length) {
			line_array.push("");
			line_count++;
		}

		// reset
		line_count = 0;

	}

	line_count = (line_count + 1) % page_length;
	line_array.push(line);
});

// populate chapter data with the title and top lineno
var chapters_array = []
line_array.forEach(function (line, i) {
	if (is_title(line)) {
		var title = line.replace(/--/g,'')
		chapters_array.push({title:title, lineno:i});
	}
});

// pad the last page of the book. kind of hacky
// we can just pad it way more than we need
var last_page_n = Math.floor(line_array.length / page_length)
for (var i = 0; i < 100; ++i) {
	line_array.push("")
}

// make the chapter dropdown menu
var dropdown = $(".dropdown-menu");
chapters_array.forEach(function (c, i) {
	dropdown.append("<li><a class=\"chapter-dropdown\" chapter-index=\"" + i + 
		"\" line-number-chapter=\"" + c.lineno + "\">" + c.title + "</a></li>");
});

function lookup_word(dirty_word) {

	var word = dirty_word.replace(/^[.,"':;!?()_-]+|[.,"';:!?()_-]+$/g, "");

	var defn = dictionary[word.toUpperCase()]
	if (defn) {
		alert("This is a half built feature!!\n\n" + defn);
	}
	else {
		alert ("Couldn't find that word in our dictionary");
	}

}

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
	page.empty();

	// new page num
	$(".page_number").text(lineno_to_pageno(top_line))

	// determines if we are at the very last page
	if (Math.floor(top_line / page_length) >= last_page_n) {
		$(".next").hide();
	}
	else {
		$(".next").show();
	}

	// build the new page
	for (var i = 0; i < page_length; ++i) {

		var linked_line = "<a class=\"result-word\">" + line_array[top_line + i].split(" ").join("</a> <a class=\"result-word\">") + "</a>";
			
			if (current_linked_query_regex) {

				var m_arr;
				while (m_arr = current_linked_query_regex.exec(linked_line)) {

					var pos = m_arr.index;
					linked_line = [linked_line.slice(0, pos), "<mark class=\"searched-word\">", linked_line.slice(pos)].join('');
					var pos = current_linked_query_regex.lastIndex + 28;
					linked_line = [linked_line.slice(0, pos), "</mark>", linked_line.slice(pos)].join('');
				}
			}

		page.append(linked_line + "<br>");
	}

	// link up the words
	$(function () {
		$("#page .result-word").click(word_click);
	});
}

// load the initial page
load_page(0)
set_title(chapters_array[0].title);

// hide these for now
$("#result-table").hide();
$("#result-table-header").hide();

var query = get_query_from_url(document.location.search);
if (query) {
	perform_search_wrapper(query);
}

function is_title(line) {
	return line.indexOf("--------") > -1
}

function set_title(title) {
	var linkified = "<a class=\"word\">" + title.split(/[ -]/).join("</a> <a class=\"word\">") + "</a>";
	$("#chapter-title").html(linkified);

	$(function () {
		$("#chapter-title .word").click(function(e) {
			var text = e.target.innerHTML.toLowerCase();
			perform_search_wrapper(text);
		});
	});
}

function get_query_from_url(url) {
	var match = /\?query=(.+)/.exec(url)
	if (match) 
		return match[1].replace(/%20/g, " ");
	else
		return null;
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
	return 0;
}

function lineno_to_pageno(lineno) {
	return Math.floor(lineno / page_length + 1);
}

function pageno_to_top_line(pageno) {
	return (pageno - 1) * page_length;
}



function perform_search(dirty_query, line_array, chapters_array) {
    
    // multithreaded function is not scope-aware, so must redefine 
    // some globals in here
    var page_length = 35;

    function lineno_to_chapter_index(lineno) {
        for (var i = chapters_array.length - 1; i >= 0; --i) {
            if (chapters_array[i].lineno <= lineno) {
                return i;
            }
        }
        return 0;
    }

    function lineno_to_pageno(lineno) {
        return Math.floor(lineno / page_length + 1);
    }

    function pageno_to_top_line(pageno) {
        return (pageno - 1) * page_length;
    }

	var query = dirty_query.replace(/^[.,"':;!?()_-]+|[.,"';:!?()_-]+$/g, "");

	if (! /\S/.test(query)) {
		return;
	}

	var punctuation = String.raw`[\.,"':;!\?\(\)\_-]{0,2}`;

	// regex magic
	var query_regex = new RegExp("\\b" + punctuation + query + punctuation + "\\b", "gi");

	var linked_query = "<a class=\"result-word\">" + query.split(" ").join(punctuation + "</a> <a class=\"result-word\">") + punctuation + "</a>";
	current_linked_query_regex = new RegExp(linked_query, "gi");

	var count = 0;
	var table = "";
	line_array.forEach(function (line, i) {

		if (query_regex.test(line)) {

			var linked_line = "<a class=\"result-word\">" + line.split(" ").join("</a> <a class=\"result-word\">") + "</a>";
			
			var m_arr;

			while (m_arr = current_linked_query_regex.exec(linked_line)) {

				count++;;

				var pos = m_arr.index;
				linked_line = [linked_line.slice(0, pos), "<mark class=\"searched-word\">", linked_line.slice(pos)].join('');
				var pos = current_linked_query_regex.lastIndex + 28;
				linked_line = [linked_line.slice(0, pos), "</mark>", linked_line.slice(pos)].join('');
			}

			// get the title and pageno
			var chap_index = lineno_to_chapter_index(i);
			var title = chapters_array[chap_index].title
			var pageno = lineno_to_pageno(i);

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
    return [table, count, query];
}

function show_search_results(results) {

    var table = results[0];
    var count = results[1];
    var query = results[2];

    // hide the old stuff, show the new
	$("#loading-img").hide();
	$("#result-table").show();
	$("#result-table-header").show();

	$("#search-term").text(query);
 
	var table_body = $("#table-body");

	// add table to DOM
	table_body.html(table)

	$("#occurences").text(count);
	
	$("#search-box").val(query);


	// link up the words
	$(function () {
		$("#search-results .result-word").click(function(e) {
			var text = e.target.innerHTML.toLowerCase();
			perform_search_wrapper(text);
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

	// manipulates the url
	//window.history.pushState(query, "", "?query=" + query);

	load_page(current_top_line);
}

var MT = new Multithread(4)
var multithread_search = MT.process(perform_search, show_search_results);

function perform_search_wrapper(query) {

	// clear the res table and display looking
	$("#search-img").hide();
	$("#result-table").hide();
	$("#result-table-header").hide();
	$("#loading-img").show();


	setTimeout(multithread_search, 50, query, line_array, chapters_array);

}

// links up the back/foward button to searches
window.onpopstate = function(e){
    if(e.state){
        perform_search_wrapper(e.state);
    }
};

// attatches func for when search is performed
$(function() {
	$("#search-btn").click(function (e) {
		e.preventDefault();
		var query = $("#search-box").val().toLowerCase();
		perform_search_wrapper(query);
	});
});

// attatches func for when search is performed
$(function() {
	$("#toggle-lights").click(function (e) {
		e.preventDefault();

		// toggle to light
		if (lights_on) {
			lights_on = false;
			$("#toggle-lights").text("Lights On");
			document.getElementById('pagestyle').setAttribute('href', "../../css/dark.css");
		}

		// toggle to dark
		else {
			lights_on = true;
			$("#toggle-lights").text("Lights Off");
			document.getElementById('pagestyle').setAttribute('href', "../../css/light.css");
		}
	});
});

// link up the words to their searches
$(function () {
	$(".word").click(word_click);
});

// link up the words to their searches
$(function () {
	$(".link-word").click(word_click);
});

$(window).load(function() {
		// Animate loader off screen
		$(".se-pre-con").fadeOut("slow");;
});
