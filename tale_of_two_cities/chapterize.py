import sys


book_num = 0
lines = list(sys.stdin)
for i in range(len(lines)):
	if (i > 10 and i < len(lines) - 10 and lines[i - 1] == "\n" and lines[i - 2] == "\n" 
		and lines[i + 1] == "\n" and lines[i + 2] == "\n"):

			print "-------- %s --------\n" % lines[i].strip(),
			sys.stderr.write(lines[i] + "\n")
	else:
		print lines[i],