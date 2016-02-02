
'use strict'

// populate all globals
var current_top_line = 0;
var page_length = 35;

// load up all the data structires we will need
var ulysses_line_array_dirty = ulysses_raw_text.split('\n');

// make the pageness work right
var ulysses_line_array = []
var line_count = 0;
var first = true;
ulysses_line_array_dirty.forEach(function (line, i) {


	if (first && is_title(line)) {
		line_count++;
		first = false;
		ulysses_line_array.push(line);
	}

	else if (!first && is_title(line)) {


		while (line_count < page_length) {
			ulysses_line_array.push("");
			line_count++;
		}

		ulysses_line_array.push(line);

		line_count = 0;

	}

	else {
		line_count++;
		if (line_count == page_length) line_count = 0;
		ulysses_line_array.push(line);
	}

});


// populate chapter data
var chapters_array = []
ulysses_line_array.forEach(function (line, i) {
	if (is_title(line)) {
		var title = line.replace(/-/g,'')
		chapters_array.push({title:title, lineno:i - 1});
	}
});

// pad the last page
var last_page_n = Math.floor(ulysses_line_array.length / page_length)
while (ulysses_line_array.length % page_length) {
	ulysses_line_array.push("")
}

var current_chapter_index = 0;

// make the chapter dropdown menu
var dropdown = $(".dropdown-menu");
chapters_array.forEach(function (c, i) {
	dropdown.append("<li><a class=\"chapter-dropdown\" chapter-index=\"" + i + "\" line-number-chapter=\"" + c.lineno + "\">" + c.title + "</a></li>")
});

function load_page(top_line) {

	if (top_line <= 0) {
		$(".last").hide();
	}
	else {
		$(".last").show();
	}

	if (current_chapter_index < chapters_array.length - 1 && 
		top_line >= chapters_array[current_chapter_index + 1].lineno) {
		current_chapter_index++;
		set_title(chapters_array[current_chapter_index].title);
	}
	else if (top_line < chapters_array[current_chapter_index].lineno) {
		current_chapter_index--;
		set_title(chapters_array[current_chapter_index].title);
	}

	// grab page
	var page = $("#page-text"); 

	// clear old page
	page.empty()

	// new page num
	$(".page_number").text(lineno_to_pageno(top_line))

	if (Math.floor(top_line / page_length + 1) >= last_page_n) {
		$(".next").hide();
	}
	else {
		$(".next").show();
	}

	// build new page
	for (var i = 0; i < page_length; ++i) {

		var line = ulysses_line_array[top_line + i] + "<br>"
		page.append(line)
	}
}

load_page(0)
set_title(chapters_array[current_chapter_index].title);
$("#result-table").hide();
$("#result-table-header").hide();

function is_title(line) {
	return line.indexOf("--------") > -1
}

function set_title(title) {
	$("#chapter-title").text(title);
}

// attatch function to every chapter dropdown
$(function() {
    $(".chapter-dropdown").click(function(e) {
    	var i = parseInt(e.target.attributes[1].value);
    	var chapter = chapters_array[i];
    	current_top_line = chapter.lineno;
    	current_chapter_index = i;
    	set_title(chapter.title)
    	load_page(current_top_line)
    });
});

$(function() {
	$(".next").click(function(e) {
		current_top_line += page_length;
		load_page(current_top_line);
	});
});

$(function() {
	$(".last").click(function(e) {
		current_top_line -= page_length;
		load_page(current_top_line);
	});
});

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

$(function() {
	$("#search-btn").click(function (e) {

		$("#search-img").hide();
		$("#result-table").show();
		$("#result-table-header").show();

		var query = $("#search-box").val().toLowerCase();

		$("#search-term").text("Showing results for: " + query);

		var table_body = $("#table-body");

		table_body.empty();
		
		var count = 0;
		ulysses_line_array.forEach(function (line, i) {
			if (line.toLowerCase().indexOf(query) > -1) {
				count++

				// get the title and pageno
				var chap_index = lineno_to_chapter_index(i);
				var title = chapters_array[chap_index].title
				var pageno = lineno_to_pageno(i);

				table_body.append("<tr>" +
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
		                                    line +
		                                "</td>" +
		                           "</tr>")

			}
		});
		console.log(count);
		$("#occurences").text(count + " occurences");

		$(function() {
			$(".result").click(function(e) {
				var pageno = parseInt(e.target.attributes[1].value);
				var lineno = pageno_to_top_line(pageno);
				var chap_index = lineno_to_chapter_index(lineno);
				current_top_line = lineno;
				current_chapter_index = chap_index;
				set_title(chapters_array[chap_index].title);
				load_page(lineno);
			});
		});

		$(function() {
			$(".search-res-chapter").click(function(e) {
		    	var i = parseInt(e.target.attributes[1].value);
		    	var chapter = chapters_array[i];
		    	current_top_line = chapter.lineno;
		    	current_chapter_index = i;
		    	set_title(chapter.title)
		    	load_page(current_top_line)
			});
		});

	});
});

