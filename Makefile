.PHONY:  validate tests release


validate:
	./node_modules/.bin/eslint \
		. \
		--ext .js


tests:
	echo "Sorry, no tests jet"


release:
	./node_modules/.bin/release-it \
		--verbose
