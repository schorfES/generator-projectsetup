async function getTodos(generator, tasks, routes) {
	if (!routes) {
		return [];
	}

	const type = Object
		.keys(routes)
		.find((key) => ['oneOf', 'manyOf'].includes(key));

	switch (type) {
		case 'oneOf':
			return await oneOf(generator, tasks, routes);
		case 'manyOf':
			return await manyOf(generator, tasks, routes);
		default:
			return [];
	}
}


async function oneOf(generator, tasks, routes) {
	const choices = routes.oneOf.map(({ key }) => {
		const found = tasks.find((task) => task.key === key);
		return found.name;
	});

	const answers = await generator.prompt([{
		message: routes.message || 'Select one',
		type: 'list',
		name: 'task',
		choices,
	}]);

	const task = tasks.find(({ name }) => name === answers.task);

	let config = null;
	if (task.questions && task.questions.length) {
		config = await generator.prompt(task.questions);
	}

	const route = routes.oneOf.find((route) => route.key === task.key);
	const next = await getTodos(generator, tasks, route.routes);
	const todos = [{ task, config }, ...next];
	return todos;
}


async function manyOf(generator, tasks, routes) {
	const choices = routes.manyOf.map(({ key }) => {
		const task = tasks.find((task) => task.key === key);
		return task.name;
	});

	const answers = await generator.prompt([{
		message: routes.message || 'Select one or more',
		type: 'checkbox',
		name: 'tasks',
		choices,
	}]);

	let todos = [];
	for (let index = 0; index < answers.tasks.length; index++) {
		const task = tasks.find(({ name }) => name === answers.tasks[index]);

		let config = null;
		if (task.questions && task.questions.length) {
			config = await generator.prompt(task.questions);
		}

		const route = routes.manyOf.find((route) => route.key === task.key);
		const next = await getTodos(generator, tasks, route.routes);
		todos = [...todos, { task, config }, ...next];
	}

	return todos;
}

module.exports = { getTodos };
