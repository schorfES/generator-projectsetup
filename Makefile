.PHONY:  validate tests


validate:
	node_modules/.bin/eslint \
		. \
		--ext .js


tests:
	echo "Sorry, no tests jet"
