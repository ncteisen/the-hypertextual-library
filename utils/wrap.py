import sys

chars_per_line = 73 # this can change. 73 works well with the html

for line in sys.stdin:
	while len(line.rstrip("\n")) > chars_per_line:
		delim = chars_per_line
		while delim > 0 and line[delim] != " ":
			delim -= 1
		if delim == 0:
			delim = chars_per_line
		sys.stdout.write(line[:delim].rstrip() + "\n")
		line = line[delim:].lstrip()
	sys.stdout.write(line)
