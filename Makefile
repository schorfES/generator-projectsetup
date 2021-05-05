.PHONY:  validate tests release


validate:
	./node_modules/.bin/eslint \
		. \
		--ext .js


tests:
	echo "Sorry, no tests yet"


release:
	./node_modules/.bin/release-it \
		--verbose
