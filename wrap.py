import sys

chars_per_line = 73 # this can change. 73 works well with the html

for line in sys.stdin.readlines():
	while (len(line) > chars_per_line):
		delim = chars_per_line
		while (line[delim] != " "):
			delim -= 1;
		print line[:delim]
		line = line[delim:]
	print line,