const { promises: fs } = require('fs');
const os = require('os');
const path = require('path');

const chalk = require('chalk');
const SimpleGit = require('simple-git');
const Generator = require('yeoman-generator');

const { getTodos } = require('./utils/todos');

// Inpired by: https://github.com/jonschlinkert/is-git-url/blob/master/index.js
const REGEXP_GITURL = /(?:git|ssh|https?|git@([-\w.]+)):(?:\/\/)?(.*?)(?:\.git)(\/?|#[-\d\w._]+?)$/;

const DIR_CACHE = '.projectsetup';
const DIR_GIT = 'git';

const FILE_CONFIG = 'projectsetup.config.js';

const GIT_DEFAULT_REMOTE = 'origin';
const GIT_DEFAULT_BRANCH = 'main';

module.exports = class extends Generator {

	constructor(args, options) {
		super(args, options);
		this.option('dir', { type: String });
		this.option('branch', { type: String });
	}

	async initializing() {
		await this._init();
		await this._checkout();
		await this._install();
	}

	async prompting () {
		await this._configure();
		await this._load();
	}

	async writing() {
		await this._runBeforeAll();
		await this._runAll();
	}

	async end() {
		await this._runAfterAll();
	}

	async _init() {
		const { dir } = this.options;
		if (dir) {
			return;
		}

		this._answers = await this.prompt([
			{
				type: 'input',
				name: 'repository',
				message: 'Your repository url including a configuration',
				validate: (input) => REGEXP_GITURL.test(input) || 'Please enter a valid repository url.',
				store: true,
			},
		]);
	}

	async _checkout() {
		let { branch, dir } = this.options;
		if (dir) {
			return;
		}

		const { repository } = this._answers;
		const [, hostname, pathname] = repository.match(REGEXP_GITURL);
		branch = branch || GIT_DEFAULT_BRANCH;

		dir = path.join(os.homedir(), DIR_CACHE, DIR_GIT, hostname, pathname);
		this.options.dir = dir;

		try {
			this.log(chalk.blue('Cache'), chalk.white(dir));
			await fs.mkdir(dir, { recursive: true });
		} catch (error) {
			this.log.error(chalk.red('Checkout failed'), chalk.white(error.message));
			process.exit(1);
		}

		const git = SimpleGit({ baseDir: dir });
		try {
			this.log(chalk.blue('Checkout'), chalk.white(repository));
			await git.init();

			// Add remote if not exists
			const remotes = await git.getRemotes();
			const exists = !!remotes.find((remote) => remote.name === GIT_DEFAULT_REMOTE);
			if (!exists) {
				await git.addRemote(GIT_DEFAULT_REMOTE, repository);
			}

			// Fetch latest and checkout branch
			await git.fetch(['--prune']);
			await git.checkout(branch);
		} catch (error) {
			this.log(chalk.yellow('  Checkout error'), chalk.white(error.message));
		}

		try {
			await git.pull(GIT_DEFAULT_REMOTE, branch, ['--rebase']);
		} catch (error) {
			this.log.error(chalk.red('Checkout failed'), chalk.white(error.message));
			process.exit(1);
		}
	}

	async _install() {
		const { dir } = this.options;
		const file = path.join(dir, 'package.json');
		if (!this.fs.exists(file)) {
			return;
		}

		const pkg = this.fs.readJSON(file);
		const deps = pkg.dependencies;
		if (!deps || Object.keys(deps).length === 0) {
			return;
		}

		this.log(chalk.blue('Install'), chalk.white('config dependencies...'));
		await this.spawnCommandSync('npm', ['install', '--production'], { cwd: dir, stdio: 'ignore' });
		this.log(chalk.blue('Install'), chalk.white('config dependencies completed'));
	}

	async _configure() {
		const { dir } = this.options;
		const file = path.join(dir, FILE_CONFIG);

		this.log(chalk.blue('Configure'), chalk.white(file));
		try {
			const stats = await fs.stat(file);

			if (!stats.isFile()) {
				throw new Error('Missing config file');
			}
		} catch (error) {
			this.log.error(chalk.red('Invalid or missing config file'), chalk.white(file));
			process.exit(1);
		}

		this.options.config = require(file);
	}

	async _load() {
		const { dir } = this.options;
		const { routes, tasks } = this.options.config;
		const todos = await getTodos(this, tasks, routes);

		const entries = [];
		this._entries = entries;
		const params = [];
		this._params = params;

		// Create shared config:
		const config = todos.reduce((acc, todo) => Object.assign(acc, todo.config), {});

		// Load required entries:
		for (let i = 0; i < todos.length; i++) {
			const todo = todos[i];
			const { entry } = todo.task;

			if (!entry) {
				// Skip this task if there is no entry file defined.
				continue;
			}

			const file = path.join(dir, entry);
			try {
				const task = require(file);
				entries.push(task);
				params.push({
					task: todo.task,
					todos: [...todos],
					generator: this, // @FIXME: Should we pass an instance of the current generator?
					config,
					dir,
				});
			} catch (error) {
				this.log.error(chalk.red('Invalid or missing task entry'), chalk.white(file));
				this.log(chalk.white(error));
				process.exit(1);
			}
		}
	}

	async _runBeforeAll() {
		const entries = this._entries;
		const params = this._params;

		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			if (!entry) {
				return;
			}

			if (typeof entry.beforeAll === 'function') {
				await entry.beforeAll(params[i]);
			}
		}
	}

	async _runAll() {
		const entries = this._entries;
		const params = this._params;

		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			if (!entry) {
				return;
			}

			if (typeof entry.run === 'function') {
				await entry.run(params[i]);
			}
		}
	}

	async _runAfterAll() {
		const entries = this._entries;
		const params = this._params;

		// Run after all (reversed):
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i];
			if (!entry) {
				return;
			}

			if (typeof entry.afterAll === 'function') {
				await entry.afterAll(params[i]);
			}
		}
	}
}
