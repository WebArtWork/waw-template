const fs = require("fs");
const path = require("path");
const scripts = require("./index");
const new_page = function (waw) {
	waw.argv.shift();
	if (!waw.argv.length) {
		console.log("Provide Name");
		process.exit(0);
	}
	let name = waw.argv[0].toLowerCase();
	let Name = name.slice(0, 1).toUpperCase() + name.slice(1);
	let location = path.join(process.cwd(), "pages", name);

	if (fs.existsSync(location)) {
		console.log("Page already exists");
		process.exit(0);
	}
	fs.mkdirSync(location, { recursive: true });

	let code = fs.readFileSync(__dirname + "/page/index.html", "utf8");
	code = code.split("CNAME").join(Name);
	code = code.split("NAME").join(name);
	fs.writeFileSync(path.join(location, name + ".html"), code, "utf8");

	code = fs.readFileSync(__dirname + "/page/page.json", "utf8");
	code = code.split("CNAME").join(Name);
	code = code.split("NAME").join(name);
	fs.writeFileSync(path.join(location, "page.json"), code, "utf8");

	console.log("Page has been created");
	process.exit();
};
module.exports.page = new_page;
module.exports.p = new_page;

const build = async function (waw) {
	if (!fs.existsSync(process.cwd(), "template.json")) {
		console.log(
			"Looks like this is not waw template project, I cannot build it"
		);
		process.exit(1);
	}
	const wjst = require(path.join(waw._modules.sem.__root, "wjst"));
	const sem = require(path.join(waw._modules.sem.__root, "index"));
	const core = require(path.join(waw._modules.core.__root, "index"));
	core(waw);
	sem(waw);
	wjst(waw);
	scripts(waw);
	if (!fs.existsSync(process.cwd(), "base.html")) {
		console.log(
			"Looks like you don't base.html, please rename index.html into base.html"
		);
		process.exit(1);
	}
	const folders = waw.getDirectories(path.join(process.cwd(), "pages"));
	const templateJson = waw.readJson(
		path.join(process.cwd(), "template.json")
	);
	for (const folder of folders) {
		const page = path.basename(folder);
		waw.build(process.cwd(), page);
		const json = {
			...templateJson,
			...waw.readJson(
				path.join(process.cwd(), "pages", page, "page.json")
			),
			...(waw.config.build || {})
		};
		fs.writeFileSync(
			path.join(process.cwd(), page + '.html'),
			waw.wjst.compileFile(
				path.join(process.cwd(), "dist", page + ".html")
			)(json),
			"utf8"
		);
	}

	if (waw.config.build && waw.config.build.page) {
		if (
			typeof waw.config.build.page === 'object' &&
			!Array.isArray(waw.config.build.page)
		) {
			waw.config.build.page = [waw.config.build.page];
		}

		for (const page of waw.config.build.page) {
			if (
				!page.json ||
				!page.name ||
				(
					!page.folder &&
					!page.url
				)
			) {
				continue;
			}

			const localJson = typeof page.json === 'string' ?
				JSON.parse(await fs.readFileSync(
					path.join(process.cwd(), page.json + '.json'),
					"utf8"
				)) : page.json;

			if (page.folder) {
				const folder = path.join(process.cwd(), page.folder)

				if (!fs.existsSync(folder)) {
					fs.mkdirSync(folder);
				}

				for (const doc of localJson[page.json]) {
					const json = {
						...templateJson,
						...waw.readJson(
							path.join(
								process.cwd(),
								"pages",
								page.name,
								"page.json"
							)
						),
						...(waw.config.build || {}),
						...doc
					};
					fs.writeFileSync(
						path.join(
							folder,
							(doc.nameUrl || doc._id) + '.html'
						),
						waw.wjst.compileFile(
							path.join(process.cwd(), "dist", page.name + ".html")
						)(json),
						"utf8"
					);
				}
			} else if (page.url) {
				const json = {
					...templateJson,
					...waw.readJson(
						path.join(
							process.cwd(),
							"pages",
							page.name,
							"page.json"
						)
					),
					...(waw.config.build || {}),
					...localJson
				};
				fs.writeFileSync(
					path.join(process.cwd(), page.url + '.html'),
					waw.wjst.compileFile(
						path.join(process.cwd(), "dist", page.name + ".html")
					)(json),
					"utf8"
				);
			}
		}
	}

	console.log("Template is builded");
	process.exit();
};
module.exports.build = build;
module.exports.b = build;

async function fetchInfo(url) {
	try {
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Error:', error.message);
	}
}

const fetch_module = async function (waw) {
	if (!waw.config.fetch) {
		console.warn('There is no configuration to fetch content');

		process.exit();
	}

	for (const info in waw.config.fetch) {
		const json = {};

		json[info] = await fetchInfo(waw.config.fetch[info]);

		fs.writeFileSync(
			path.join(process.cwd(), info + '.json'),
			JSON.stringify(json, null, 4)
		);

	}

	console.log('Information has been fetched');

	process.exit();
}
module.exports.fetch = fetch_module;
module.exports.f = fetch_module;
