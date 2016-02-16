import sys


book_num = 0
lines = list(sys.stdin)
to_print = []
for i in range(len(lines)):
	if (i > 10 and i < len(lines) - 10 and lines[i] != "\n" and lines[i - 1] == "\n" and lines[i - 2] == "\n" 
		and lines[i + 1] == "\n" and lines[i + 2] == "\n"):
			to_print.pop()
			to_print.pop()
			to_print.pop()
			to_print.pop()
			to_print.append("-------- %s --------\n" % lines[i].strip())
			sys.stderr.write(lines[i] + "\n")
	else:
		to_print.append(lines[i])

print ''.join(to_print)