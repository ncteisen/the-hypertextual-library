import sys


book_num = 0
for line in sys.stdin.readlines():
	if ("CHAPTER" in line):
		line = line.strip()
		line = line[0] + line[1:7].lower() + line[7:]
		if (line == "Chapter I"):
			book_num += 1
		print "-------- Book %d: %s --------\n" % (book_num, line),
		sys.stderr.write(line + "\n")
	else:
		print line,