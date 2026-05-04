'use strict';

var current_top_line = 0;
var page_length = 35;
var current_query = '';
var last_search_payload = null;
var line_sort_ascending = true;
var line_array_dirty = raw_text.split('\n');
var line_array = [];
var chapters_array = [];
var last_page_n = 0;

function stylesheetPath(theme) {
    var style = document.getElementById('pagestyle');
    var href = style ? style.getAttribute('href') : '../../css/light.css';
    return href.replace(/(light|dark)\.css$/, theme + '.css');
}

function setTheme(theme) {
    var style = document.getElementById('pagestyle');
    var toggle = document.getElementById('toggle-lights');

    if (style) {
        style.setAttribute('href', stylesheetPath(theme));
    }

    document.documentElement.setAttribute('data-theme', theme);

    if (toggle) {
        toggle.textContent = theme === 'dark' ? 'Lights On' : 'Lights Off';
        toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }

    try {
        window.localStorage.setItem('hypertext-theme', theme);
    }
    catch (e) {}
}

function initializeTheme() {
    var savedTheme = 'light';
    try {
        savedTheme = window.localStorage.getItem('hypertext-theme') || 'light';
    }
    catch (e) {}

    setTheme(savedTheme === 'dark' ? 'dark' : 'light');

    var toggle = document.getElementById('toggle-lights');
    if (toggle) {
        toggle.addEventListener('click', function () {
            var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            setTheme(isDark ? 'light' : 'dark');
        });
    }
}

function is_title(line) {
    return line.indexOf('--------') > -1;
}

function clean_word(dirty_word) {
    return dirty_word.replace(/^[.,"':;!?()_-]+|[.,"';:!?()_-]+$/g, '');
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function queryToRegex(query) {
    var cleaned = clean_word(query).trim();
    if (!/\S/.test(cleaned)) return null;
    var punctuation = "[\\\\.,\"':;!\\\\?\\\\(\\\\)_-]{0,2}";
    return new RegExp('\\b' + punctuation + escapeRegExp(cleaned) + punctuation + '\\b', 'gi');
}

function makeWordLink(text, extraClass) {
    var link = document.createElement('a');
    link.className = extraClass || 'result-word';
    link.href = '#';
    link.textContent = text;
    link.addEventListener('click', word_click);
    return link;
}

function appendLinkedLine(container, line, query) {
    var queryWords = clean_word(query).toLowerCase().split(/\s+/).filter(Boolean);
    var shouldHighlight = queryWords.length > 0;
    var parts = line.split(/(\s+)/);
    var emptyLine = true;

    parts.forEach(function (part) {
        if (!part) return;

        if (/^\s+$/.test(part)) {
            container.appendChild(document.createTextNode(part));
            return;
        }

        emptyLine = false;
        var link = makeWordLink(part, 'result-word');
        var cleaned = clean_word(part).toLowerCase();

        if (shouldHighlight && queryWords.indexOf(cleaned) !== -1) {
            var mark = document.createElement('mark');
            mark.className = 'searched-word';
            mark.appendChild(link);
            container.appendChild(mark);
        }
        else {
            container.appendChild(link);
        }
    });

    if (emptyLine) {
        container.appendChild(document.createTextNode('\u00a0'));
    }
}

function appendCanonicalLine(container, entry, query) {
    var lineSpan = document.createElement('span');
    lineSpan.className = is_title(entry.text) ? 'reader-line reader-line--chapter' : 'reader-line';
    lineSpan.dataset.displayLine = String(entry.displayLine);

    if (entry.sourceLine) {
        lineSpan.id = 'L' + entry.sourceLine;
        lineSpan.dataset.line = String(entry.sourceLine);
        lineSpan.title = 'Source line ' + entry.sourceLine;
    }

    appendLinkedLine(lineSpan, entry.text, query);
    container.appendChild(lineSpan);
}

var word_click = function (e) {
    e.preventDefault();
    var text = e.currentTarget.textContent.toLowerCase();
    if (e.altKey) {
        lookup_word(text);
    }
    else {
        perform_search_wrapper(text);
    }
};

function buildPagedLines() {
    var line_count = 0;
    var first = true;

    function pushLine(text, sourceLine, isPadding) {
        line_array.push({
            text: text,
            sourceLine: sourceLine,
            displayLine: line_array.length,
            isPadding: Boolean(isPadding)
        });
    }

    line_array_dirty.forEach(function (line, sourceIndex) {
        if (first && is_title(line)) {
            first = false;
        }
        else if (!first && is_title(line)) {
            while (line_count % page_length) {
                pushLine('', null, true);
                line_count++;
            }
            line_count = 0;
        }

        line_count = (line_count + 1) % page_length;
        pushLine(line, sourceIndex + 1, false);
    });

    line_array.forEach(function (entry, i) {
        if (is_title(entry.text)) {
            var title = entry.text.replace(/--/g, '').trim();
            chapters_array.push({title: title || 'Chapter', lineno: i, sourceLine: entry.sourceLine});
        }
    });

    if (!chapters_array.length) {
        chapters_array.push({title: 'Opening', lineno: 0});
    }

    last_page_n = Math.floor(Math.max(line_array.length - 1, 0) / page_length);

    for (var i = 0; i < 100; ++i) {
        pushLine('', null, true);
    }
}

function buildChapterMenu() {
    var dropdown = document.querySelector('.chapter-list');
    if (!dropdown) return;

    dropdown.innerHTML = '';
    chapters_array.forEach(function (chapter, i) {
        var item = document.createElement('li');
        var link = document.createElement('a');
        link.className = 'chapter-dropdown';
        link.href = '#';
        link.dataset.chapterIndex = String(i);
        link.dataset.lineNumberChapter = String(chapter.lineno);
        link.textContent = chapter.title;
        link.addEventListener('click', function (e) {
            e.preventDefault();
            load_chapter(i);
            var menu = document.querySelector('.chapter-menu');
            if (menu) menu.removeAttribute('open');
        });
        item.appendChild(link);
        dropdown.appendChild(item);
    });
}

function lookup_word(dirty_word) {
    var word = clean_word(dirty_word);
    var defn = dictionary[word.toUpperCase()];

    if (defn) {
        alert('This is a half built feature!!\n\n' + defn);
    }
    else {
        alert("Couldn't find that word in our dictionary");
    }
}

function set_title(title) {
    var chapterTitle = document.getElementById('chapter-title');
    if (!chapterTitle) return;

    chapterTitle.innerHTML = '';
    title.split(/[ -]/).filter(Boolean).forEach(function (word, i) {
        if (i) chapterTitle.appendChild(document.createTextNode(' '));
        chapterTitle.appendChild(makeWordLink(word, 'word'));
    });
}

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

function setHiddenForAll(selector, hidden) {
    document.querySelectorAll(selector).forEach(function (element) {
        element.hidden = hidden;
    });
}

function load_page(top_line) {
    if (top_line < 0) top_line = 0;
    if (Math.floor(top_line / page_length) > last_page_n) {
        top_line = last_page_n * page_length;
    }

    current_top_line = top_line;

    setHiddenForAll('.last', top_line <= 0);
    setHiddenForAll('.next', Math.floor(top_line / page_length) >= last_page_n);

    var chap_index = lineno_to_chapter_index(top_line);
    set_title(chapters_array[chap_index].title);

    document.querySelectorAll('.page_number').forEach(function (element) {
        element.textContent = 'Page ' + lineno_to_pageno(top_line);
    });

    var page = document.getElementById('page-text');
    if (!page) return;

    page.innerHTML = '';
    var paragraph = null;

    function ensureParagraph() {
        if (!paragraph) {
            paragraph = document.createElement('p');
            paragraph.className = 'reader-paragraph';
            page.appendChild(paragraph);
        }
        return paragraph;
    }

    function closeParagraph() {
        paragraph = null;
    }

    for (var i = 0; i < page_length; ++i) {
        var entry = line_array[top_line + i] || {text: '', sourceLine: null, displayLine: top_line + i, isPadding: true};

        if (!entry.text.trim()) {
            closeParagraph();
            continue;
        }

        if (is_title(entry.text)) {
            closeParagraph();
            var chapterLine = document.createElement('p');
            chapterLine.className = 'reader-paragraph reader-paragraph--chapter';
            appendCanonicalLine(chapterLine, entry, current_query);
            page.appendChild(chapterLine);
            closeParagraph();
            continue;
        }

        var target = ensureParagraph();
        appendCanonicalLine(target, entry, current_query);
        target.appendChild(document.createTextNode(' '));
    }
}

function load_chapter(chap_index) {
    current_top_line = chapters_array[chap_index].lineno;
    load_page(current_top_line);
}

function get_query_from_url(url) {
    var match = /\?query=(.+)/.exec(url);
    if (match) {
        return decodeURIComponent(match[1].replace(/\+/g, ' '));
    }
    return null;
}

function perform_search(dirty_query) {
    var query = clean_word(dirty_query).trim();
    var query_regex = queryToRegex(query);
    var results = [];
    var count = 0;

    if (!query_regex) {
        return {results: results, count: count, query: query};
    }

    line_array.forEach(function (entry, i) {
        if (!entry.sourceLine || entry.isPadding) return;

        var line = entry.text;
        query_regex.lastIndex = 0;
        var matches = line.match(query_regex);
        if (!matches) return;

        count += matches.length;
        var chap_index = lineno_to_chapter_index(i);
        results.push({
            title: chapters_array[chap_index].title,
            chapterIndex: chap_index,
            lineNumber: entry.sourceLine,
            displayLine: i,
            pageNumber: lineno_to_pageno(i),
            line: line
        });
    });

    return {results: results, count: count, query: query};
}

function sortedResults(results) {
    return results.slice().sort(function (a, b) {
        return line_sort_ascending ? a.lineNumber - b.lineNumber : b.lineNumber - a.lineNumber;
    });
}

function toggleResultSort() {
    line_sort_ascending = !line_sort_ascending;
    if (last_search_payload) {
        show_search_results(last_search_payload);
    }
}

window.toggleResultSort = toggleResultSort;

function show_search_results(payload) {
    var searchImage = document.getElementById('search-img');
    var loadingImage = document.getElementById('loading-img');
    var resultTable = document.getElementById('result-table');
    var resultHeader = document.getElementById('result-table-header');
    var tableBody = document.getElementById('table-body');
    var searchTerm = document.getElementById('search-term');
    var occurrences = document.getElementById('occurrences');
    var searchBox = document.getElementById('search-box');
    var sortButton = document.getElementById('sort-line-results');

    last_search_payload = payload;
    current_query = payload.query;

    if (loadingImage) loadingImage.hidden = true;
    if (searchImage) searchImage.hidden = true;
    if (resultTable) resultTable.hidden = false;
    if (resultHeader) resultHeader.hidden = false;
    if (searchTerm) searchTerm.textContent = payload.query;
    if (occurrences) occurrences.textContent = payload.count;
    if (searchBox) searchBox.value = payload.query;
    if (sortButton) {
        sortButton.textContent = line_sort_ascending ? 'Line \u2191' : 'Line \u2193';
        sortButton.setAttribute('aria-label', line_sort_ascending ? 'Sort results by line descending' : 'Sort results by line ascending');
    }

    if (tableBody) {
        tableBody.innerHTML = '';
        sortedResults(payload.results).forEach(function (result) {
            var row = document.createElement('tr');
            row.dataset.line = String(result.lineNumber);

            var chapterCell = document.createElement('td');
            chapterCell.className = 'chapter';
            var chapterLink = document.createElement('a');
            chapterLink.className = 'result search-res-chapter';
            chapterLink.href = '#';
            chapterLink.textContent = result.title;
            chapterLink.addEventListener('click', function (e) {
                e.preventDefault();
                load_chapter(result.chapterIndex);
            });
            chapterCell.appendChild(chapterLink);

            var lineCell = document.createElement('td');
            lineCell.className = 'line-number';
            var lineLink = document.createElement('a');
            lineLink.className = 'result';
            lineLink.href = '#';
            lineLink.textContent = result.lineNumber;
            lineLink.addEventListener('click', function (e) {
                e.preventDefault();
                current_top_line = pageno_to_top_line(result.pageNumber);
                load_page(current_top_line);
                var targetLine = document.getElementById('L' + result.lineNumber);
                if (targetLine) {
                    targetLine.classList.add('reader-line--target');
                    targetLine.scrollIntoView({block: 'center', behavior: 'smooth'});
                    window.setTimeout(function () {
                        targetLine.classList.remove('reader-line--target');
                    }, 1600);
                }
            });
            lineCell.appendChild(lineLink);

            var textCell = document.createElement('td');
            textCell.className = 'line';
            appendLinkedLine(textCell, result.line, payload.query);

            row.appendChild(chapterCell);
            row.appendChild(lineCell);
            row.appendChild(textCell);
            tableBody.appendChild(row);
        });
    }

    load_page(current_top_line);
}

function perform_search_wrapper(query) {
    var searchImage = document.getElementById('search-img');
    var loadingImage = document.getElementById('loading-img');
    var resultTable = document.getElementById('result-table');
    var resultHeader = document.getElementById('result-table-header');

    if (searchImage) searchImage.hidden = true;
    if (resultTable) resultTable.hidden = true;
    if (resultHeader) resultHeader.hidden = true;
    if (loadingImage) loadingImage.hidden = false;

    window.setTimeout(function () {
        show_search_results(perform_search(query));
    }, 60);
}

function initializeControls() {
    document.querySelectorAll('.next').forEach(function (button) {
        button.addEventListener('click', function () {
            load_page(current_top_line + page_length);
        });
    });

    document.querySelectorAll('.last').forEach(function (button) {
        button.addEventListener('click', function () {
            load_page(current_top_line - page_length);
        });
    });

    var form = document.getElementById('search-form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var query = document.getElementById('search-box').value.toLowerCase();
            perform_search_wrapper(query);
        });
    }

    document.querySelectorAll('.word, .link-word').forEach(function (link) {
        link.addEventListener('click', word_click);
    });
}

window.onpopstate = function (e) {
    if (e.state) {
        perform_search_wrapper(e.state);
    }
};

window.addEventListener('load', function () {
    var loader = document.querySelector('.se-pre-con');
    if (loader) {
        loader.style.opacity = '0';
        window.setTimeout(function () {
            loader.hidden = true;
        }, 180);
    }
});

document.addEventListener('DOMContentLoaded', function () {
    initializeTheme();
    buildPagedLines();
    buildChapterMenu();
    initializeControls();
    load_page(0);

    var query = get_query_from_url(document.location.search);
    if (query) {
        perform_search_wrapper(query);
    }
});
