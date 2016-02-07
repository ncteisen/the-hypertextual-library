import sys


book_num = 0
for line in sys.stdin.readlines():
	if ("Chapter" in line):
		line = line.strip()
		line = line[0] + line[1:7].lower() + line[7:]
		print "-------- %s --------\n" % line,
		sys.stderr.write(line + "\n")
	else:
		print line,