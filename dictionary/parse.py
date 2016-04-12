import sys
import json
import re
import pprint

data = sys.stdin.readlines()

dictionary = {}

def is_word(line):
	if line.isupper():
		return True
	return False

def is_defn_start(line):
	if line.startswith("Defn:"):
		return True
	return False

def is_defn2_start(line):
	if re.match("^\d+\. *", line):
		return True
	return False

def is_syn_start(line):
	if line.startswith("Syn."):
		return True
	return False

# fuck pythons lack of enums
# i love states
state = "none"
cur_chunk = ""
cur_word = ""
cur_word_obj = {"junk": "", "def":[], "syn" : []}

counter = 100

# iterate over everything
for line in data:

	if counter <= 0:
		break
	counter -= 1

	# know to switch words
	if (is_word(line)):

		if state == "def" or state == "def2":
			cur_word_obj["def"] += [cur_chunk]
		elif state == "syn":
			cur_word_obj["syn"] += [cur_chunk]

		# finish old word
		if isinstance(cur_word, list):
			for word in cur_word:
				if word in dictionary:
						dictionary[word]["def"] += cur_word_obj["def"]
						dictionary[word]["syn"] += cur_word_obj["syn"]
				else:
					dictionary[word] = cur_word_obj;
		else:
			if cur_word in dictionary:
					dictionary[cur_word]["def"] += cur_word_obj["def"]
					dictionary[cur_word]["syn"] += cur_word_obj["syn"]
			else:
				dictionary[cur_word] = cur_word_obj;

		state = "junk"

		# could be one word, could be multiple spellings
		line = line.strip().lower()
		if (';' in line):
			cur_word = map(lambda w: w.strip(), line.split(';'))
		else:
			cur_word = line

		cur_word_obj = {"junk": "", "def":[], "syn" : []}

	elif is_defn_start(line):

		if state == "junk":
			cur_word_obj["junk"] = cur_chunk

		elif state == "def2":
			cur_chunk += line.strip()
			continue

		state = "def"
		cur_chunk = line.strip()

	# used for .1, .2 bc those might have defns
	elif is_defn2_start(line):

		if state == "junk":
			cur_word_obj["junk"] = cur_chunk

		state = "def2"
		cur_chunk = line.strip()

	elif is_syn_start(line):

		if state == "def" or state == "def2":
			cur_word_obj["def"] += [cur_chunk]

		state = "syn"
		cur_chunk = line.strip()

	else:
		cur_chunk += line.strip()

pprint.pprint(dictionary)


# Defn:
# Note:
# 1.
# 2.
# Syn.