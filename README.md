# The Hypertext Library

See this website in action [here](http://hypertextlibrary.com/ "The Hypertext Library")!


## Our Mission

Our website is devoted to the idea that 
literature can be analyzed in a hypertextual manner. 
A certain word or phrase may appear several times for a given book, and we believe there is 
meaning embedded in the links between the occurrences. The Hypertext Library allows you to treat a book 
like a brain, with synaptic connections from word to word, strengthening the meaning behind 
the text.

## How to Request a Book

If there is a book you would like to see added to the website, shoot me an email (ncteisen@umich.edu) with a link to the
text from the book. The book must be in the public domain in order to be added to this website. 
[Project Gutenberg] (https://www.gutenberg.org/ "Project Gutenberg") is a great place to find books that are
availible to be added to the library.

## How to Contribute

If you are interested in contributing to this site, either by improving the code or added more books, please
read the overview of all of the files. Once you are comfortable with how the project works, fork this repo and
make a pull request. I will accept it after testing it.

## Overview of the Files

Many of the files in the project are generated, and should not be modified. The templates folder contains 
the base files for all the generated html and js code. The `generator.py` file is responsible for creation of 
books.js, index.html, and most of the content of the per book directories. All of these files will be explained
in more detail in the following sections.

### Non Generated Files

#### `books.json`

This file stores all of the books in the library as JSON objects. Each book must have a title, author, 
and uniquename. The uniquename is a one word identifier (could have underscores) of the novel. It will be used
by generator.py to create all the needed files per book.

#### `<uniquename>/text.txt`

This file stores the raw text for each book. The text must be in a very strict format. All lines must be less than 75
characters long. The `wrap.py` files can be used to wrap text with longer lines. All chapter titles must be sandwiched by
8 dashes, and there should be no new lines between the end of a previous chapter and the new chapter title. Here is an example
of a clean chapter transition:

```
and this is how we must end the previous chapter, note how
the text hugs the new chapter title closely.
-------- Chapter Title --------

This is the start of the next chapter. blah blah blah blah
blah and so on and so on.
```

If a book has a lot of chapters, it may be necessary to clean the text with a python script. The `chapterize.py` script
can be very useful, althought you will have to make small modification to it for every book you process.

#### `<uniquename>/<uniquname>.jpg`

This is the picture that will be displayed for each book. It should be of the cover of the book.

#### `book-page-search.js`

This file contains the bulk of the code for the actual webpages. The code in this file is responsible for loading each 
page of the text as users click the next and prev page buttons. It is also responsible for performing the searches
when a user inputs a certain query. Lastly, this file will link up all of the words on the website to be clickable. 
Clicking a certain word will cause a query to be executed for that particular word.

If you want more details about the implementation, see the code, for it is well commented. One high level note about the
query functionality is that every search will iterate over every single line of the text.

#### `css/light.css` and `css/dark.css`

These are the personal style files. One is for classic, and the other is for light-on-dark reading. They are switched
dynamically by the javascript.

#### `generator.py`

This file reads in `books.json` and then generated several common files using templates, as well as many per book files. 
These will be discussed in the following sections. `generator.py` will only generate a website for a book if there exists
a directory that is named the book's uniquename. This directory must include the `text.txt` and `<uniquename>.jpg` file.

### Templates and Generated Files

The following template files are located in the `templates` folder. They are read in by `generator.py`, which adds data to them
and then writes out all of the generated files.

#### `library.html` and `index.html`

`library.html` is the template file for the library homepage. It includes a spot to insert the list of all the books 
in the library. `generator.py` will generate this list, add it to the template, and then output the `index.html` file.

#### `raw_text.js` and `<uniquename>/<uniquename>_text.js`

This is the template for the Javascript files that hold the entire text of each book. `generator.py` will read it in, then
insert all of the text contained in `<uniquename>/text.txt`, then output the `<uniquename>/<uniquename>_text.js` file.

#### `template.html` and `<uniquename>/index.html`

`template.html` is the template file for the html code for each book page. It leaves spots to insert the title, author, 
and `<uniquename>/<uniquename>_text.js` files
that each site will need. `generator.py` reads it in, fills in the needed info, then writes it to `<uniquename>/index.html` 
for every book.
