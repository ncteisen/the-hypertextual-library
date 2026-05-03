'use strict';

var old_search = null;

function stylesheetPath(theme) {
    var style = document.getElementById('pagestyle');
    var href = style ? style.getAttribute('href') : 'css/light.css';
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

function book_matches_search(book, search) {
    var parts = search.toLowerCase().split(/\s+/).filter(Boolean);
    var creator = book.author || book.director || '';

    for (var i = 0; i < parts.length; ++i) {
        if (book.title.toLowerCase().indexOf(parts[i]) < 0 &&
            creator.toLowerCase().indexOf(parts[i]) < 0) {
            return false;
        }
    }

    return true;
}

function reload_book_list(search) {
    var bookList = document.getElementById('book-list');
    var countText = document.getElementById('book-count');

    if (!bookList || typeof book_list === 'undefined') return;

    var nextHtml = '';
    var count = 0;

    book_list.forEach(function (book) {
        if (book_matches_search(book, search)) {
            count += 1;
            nextHtml += book.html;
        }
    });

    bookList.innerHTML = nextHtml;

    if (countText) {
        var total = book_list.length;
        if (search) {
            countText.textContent = count + ' of ' + total + ' books match your search.';
        }
        else {
            countText.textContent = total + ' books waiting on the shelves.';
        }
    }
}

function initializeLibrarySearch() {
    var searchBox = document.getElementById('search-box');
    if (!searchBox || typeof book_list === 'undefined') return;

    reload_book_list(searchBox.value || '');

    searchBox.addEventListener('input', function () {
        var newSearch = searchBox.value;
        if (old_search === newSearch) return;
        old_search = newSearch;
        reload_book_list(newSearch);
    });
}

function initializeDialogs() {
    var openers = document.querySelectorAll('[data-dialog-open]');
    var closers = document.querySelectorAll('[data-dialog-close]');

    openers.forEach(function (opener) {
        opener.addEventListener('click', function () {
            var dialog = document.getElementById(opener.getAttribute('data-dialog-open'));
            if (!dialog) return;

            if (typeof dialog.showModal === 'function') {
                dialog.showModal();
            }
            else {
                dialog.setAttribute('open', '');
            }
        });
    });

    closers.forEach(function (closer) {
        closer.addEventListener('click', function () {
            var dialog = closer.closest('dialog');
            if (!dialog) return;

            if (typeof dialog.close === 'function') {
                dialog.close();
            }
            else {
                dialog.removeAttribute('open');
            }
        });
    });

    document.addEventListener('click', function (event) {
        if (event.target instanceof HTMLDialogElement) {
            event.target.close();
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    initializeTheme();
    initializeLibrarySearch();
    initializeDialogs();
});
