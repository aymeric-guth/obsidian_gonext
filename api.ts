import { Paths, Status, Types, Namespace, Default } from "./constants";

class ValidationError extends Error {
	constructor(message) {
		super(message); // (1)
		this.name = "ValidationError"; // (2)
	}
}

export const Assert = {
	True(predicate: bool, message: string) {
		if (!predicate) {
			throw new ValidationError(message);
		}
	},
};

export const Helper = {
	nilCheck(val: Any): bool {
		return val === undefined || val === null;
	},

	getKeyFuck(groupBy) {
		switch (groupBy) {
			default:
			case "doneAt":
				return (entry) =>
					entry.file.frontmatter.doneAt.toISOString().slice(0, 10);
				break;
			case "createdAt":
				return (entry) =>
					entry.file.frontmatter.createdAt.toISOString().slice(0, 10);
				break;
			case "project":
				return (entry) => entry.file.frontmatter.project;
				break;
			case "area":
				return (entry) => entry.file.frontmatter.area;
				break;
		}
	},

	getKey(groupBy) {
		switch (groupBy) {
			default:
			case "doneAt":
				return (entry) => entry.doneAt.toISOString().slice(0, 10);
				break;
			case "createdAt":
				return (entry) => entry.createdAt.toISOString().slice(0, 10);
				break;
			case "project":
				return (entry) => entry.project;
				break;
			case "area":
				return (entry) => entry.area;
				break;
		}
	},

	numberTypeToString(val: number): string {
		switch (val) {
			case Types.Fleeting:
				return "fleeting";
				break;
			case Types.Log:
				return "log";
				break;
			default:
				throw new Error(
					`numberTypeToString: type: "${val}" not implemented`,
				);
		}
	},

	roundToOneDecimal(val: number): number {
		return Math.round(val * 10) / 10;
	},

	isChildTag(parent, child) {
		if (child.length <= parent.length + 1) {
			return false;
		} else if (child.slice(0, parent.length + 1) != `${parent}/`) {
			return false;
		}
		return true;
	},

	getField(field, defaultValue) {
		if (field === undefined || field === null) {
			return defaultValue;
		} else {
			return field;
		}
	},

	getDate(dt) {
		if (dt === "" || dt === null) {
			return undefined;
		} else if (dt !== undefined) {
			dt = new Date(dt);
			if (isNaN(dt)) {
				return undefined;
			} else {
				return dt;
			}
		} else {
			return undefined;
		}
	},

	getTag(fm, type, emptyDefault) {
		let name = "";
		let defaultValue = "";

		if (type === "area") {
			name = Namespace.Area;
			defaultValue = Default.Area;
		} else if (type === "context") {
			name = Namespace.Context;
			defaultValue = Default.Context;
		} else if (type === "layer") {
			name = Namespace.Layer;
			defaultValue = Default.Layer;
		} else if (type === "org") {
			name = Namespace.Org;
			defaultValue = Default.Org;
		} else if (type === "project") {
			name = Namespace.Project;
			defaultValue = Default.Project;
		} else if (type == "domain") {
			name = "domain";
			defaultValue = "none";
		} else {
			throw new Error(`getTag got unsuported type: '${type}'`);
		}

		const len = name.length + 1;
		const defaultTag = `${name}/${defaultValue}`;

		let defaultRetVal = defaultTag;
		if (emptyDefault) {
			defaultRetVal = undefined;
		}

		if (fm === undefined) {
			return defaultRetVal;
		}

		const tags = fm.tags;
		if (tags === undefined || tags.length === 0) {
			return defaultRetVal;
		}
		// -> tag n'existe pas -> valeur par defaut
		// -> tag existe mais il a une valeur par defaut -> valeur par defaut
		for (const tag of tags) {
			if (tag == defaultTag) {
				return defaultRetVal;
			}

			if (tag.length > len && tag.slice(0, len) == `${name}/`) {
				return tag;
			}
		}

		return defaultRetVal;
	},

	getArea(fm, emptyDefault = false) {
		return Helper.getTag(fm, "area", emptyDefault);
	},

	getContext(fm, emptyDefault = false) {
		return Helper.getTag(fm, "context", emptyDefault);
	},

	getDomain(fm, emptyDefault = false) {
		return Helper.getTag(fm, "domain", emptyDefault);
	},

	getLayer(fm, emptyDefault = false) {
		return Helper.getTag(fm, "layer", emptyDefault);
	},

	getOrg(fm, emptyDefault = false) {
		return Helper.getTag(fm, "org", emptyDefault);
	},

	getProject(fm, emptyDefault = false) {
		return Helper.getTag(fm, "project", emptyDefault);
	},

	durationStringToSec(val) {
		const mult = val.slice(-1);
		let m = 0;
		if (mult === "h") {
			m = 60 * 60;
		} else if (mult === "m") {
			m = 60;
		} else if (mult === "d") {
			m = 24 * 60 * 60;
		} else if (mult == "w") {
			m = 24 * 60 * 60 * 7;
		} else {
			console.warn(`Unhandled case val: ${val}`);
			return undefined;
		}

		return m * parseInt(val.slice(0, -1));
	},

	msecToStringDuration(val: number): number {
		const oneHourInMsec = 3600000; // 1 hour in msec
		const oneDayInMsec = 86400000; // 1 day in msec
		if (val >= 24 * oneHourInMsec) {
			return (
				String(Helper.roundToOneDecimal(val / oneDayInMsec)).padStart(
					2,
					"0",
				) + " d"
			);
		} else {
			return (
				String(Helper.roundToOneDecimal(val / oneHourInMsec)).padStart(
					2,
					"0",
				) + " h"
			);
		}
	},
};

export const AutoField = {
	tags(dv, fm) {
		const tags = fm.tags;
		if (tags == undefined || tags.length === 0) {
			return;
		}

		tags.sort();
		dv.header(3, "Tags");
		let s = "";
		for (const tag of tags) {
			s += ` #${tag}`;
		}
		dv.paragraph(s);
	},

	authors(dv, fm) {
		const authors = fm.authors;
		if (authors === undefined || authors.length === 0) {
			return;
		}

		dv.header(3, "Authors");
		dv.list(authors);
	},

	title(dv, fm) {
		const title = fm.alias;
		if (title === undefined || title.length === 0) {
			return;
		}

		dv.header(3, title);
	},

	logs(dv, entries) {
		const buff = [];
		let totalTime = 0;

		for (const entry of entries) {
			const fme = entry.file.frontmatter;
			const e = [];
			let start = 0;
			let stop = 0;
			if (fme === undefined || fme.created_at === undefined) {
				throw new Error(`Invalid frontmatter: ${fme.uuid}`);
			}

			start = new Date(fme.created_at);
			e.push(start.toISOString().slice(0, 10));
			if (fme.done_at === undefined) {
				stop = Date.now();
			} else {
				stop = new Date(fme.done_at);
			}
			totalTime += stop - start;
			e.push(
				dv.sectionLink(
					fme.uuid,
					"## Content",
					false,
					fme.uuid.slice(0, 8),
				),
			);
			e.push(Math.round(((stop - start) / (1000 * 60 * 60)) * 10) / 10);
			if (fme.reviewed === undefined || fme.reviewed === 0) {
				e.push(0);
			} else {
				e.push(fme.reviewed);
			}
			buff.push(e);
		}

		if (buff.length > 0) {
			dv.header(2, "Logs");
			dv.table(["created_at", "uuid", "session", "reviewed"], buff);
			if (totalTime > 0) {
				dv.paragraph(
					`_totalTime (h):_ ${
						Math.round((totalTime / (1000 * 60 * 60)) * 10) / 10
					}`,
				);
			}
		}
	},

	media(dv) {
		const current = dv.current();
		const fm = current.file.frontmatter;
		const pages = dv.pages(`"${Paths.Refs}/${fm.ref_id}"`).array();
		if (pages.length !== 1) {
			return;
		}
		const media = pages[0];
		const mediaFm = media.file.frontmatter;
		AutoField.title(dv, mediaFm);
		dv.paragraph(Renderer.makeLinkAlias(dv, media.file));
		AutoField.authors(dv, mediaFm);
		AutoField.tags(dv, mediaFm);

		const logEntries = dv
			.pages(`"${Paths.Logs}/${fm.uuid}"`)
			.where((p) => p.type === 6)
			.sort((k) => k.created_at, "desc");
		AutoField.logs(dv, logEntries);
	},
};

// this must be called from `dataviewjs` codeblocks
export const Renderer = {
	makeLinkAlias(dv, f, anchor = "Content") {
		if (Helper.nilCheck(f.frontmatter.alias)) {
			return Renderer.makeLinkShortUUID(dv, f, anchor);
		}

		return dv.sectionLink(f.path, anchor, false, `${f.frontmatter.alias}`);
	},

	makeLinkShortUUID(dv, f, anchor = "Content") {
		return dv.sectionLink(
			f.path,
			anchor,
			false,
			`${f.frontmatter.uuid.slice(0, 8)}`,
		);
	},

	inboxEntry(dv, data) {
		const cols = ["uuid", "type", "age", "size", "project", "area"];
		const buff = [];
		for (const d of data) {
			const f = d.file;
			const fm = d.file.frontmatter;
			Assert.True(
				!Helper.nilCheck(fm.uuid),
				`"uuid" id not defined for: ${f.path}`,
			);
			Assert.True(
				!Helper.nilCheck(fm.type),
				`"type" id not defined for: ${f.path}`,
			);

			const now = new Date();
			const delta = now.getTime() - fm.createdAt.getTime();
			const since = Helper.msecToStringDuration(delta);
			buff.push([
				Renderer.makeLinkAlias(dv, f),
				Helper.numberTypeToString(fm.type),
				`${since}`,
				f.size,
				fm.project === undefined ? "\\-" : fm.project,
				fm.area === undefined ? "\\-" : fm.area,
				// Helper.getProject(fm, true),
				// Helper.getArea(fm, true),
			]);
		}

		dv.table(cols, buff);
	},

	adhocTaskReady(dv, data) {
		const buff = [];
		const cols = ["uuid", "task", "estimate"];

		for (const d of data) {
			// at this point all data validation has been done
			// types are assumed consistent
			const f = d.file;
			const fm = f.frontmatter;

			switch (fm.type) {
				case Types.Task:
					buff.push([
						Renderer.makeLinkAlias(dv, f, "Task"),
						dv.markdownTaskList(f.tasks),
						fm.time_estimate,
						Helper.getField(Helper.getDomain(fm, true), "\\-"),
					]);
					break;

				case Types.Media:
					const pages = dv.pages(`"${Paths.Refs}/${fm.ref_id}"`).array();
					if (pages.length !== 1) {
						throw new Error(`adhocTaskReady: ref_id: "${fm.ref_id}" not found`);
					}

					buff.push([
						Renderer.makeLinkAlias(dv, f, "Content"),
						Renderer.makeLinkAlias(dv, pages[0].file, "Content"),
						fm.time_estimate,
						Helper.getField(Helper.getDomain(fm, true), "\\-"),
					]);
					break;

				default:
					throw new Error(`adhocTaskReady: Unhandled type: '${fm.type}'`);
			}
		}

		dv.table(cols, buff);
	},

	resourceBase(dv, data) {
		const cols = ["uuid"];
		const buff = [];
		for (const d of data) {
			const f = d.file;
			const fm = d.file.frontmatter;
			Assert.True(
				!Helper.nilCheck(fm.uuid),
				`"uuid" id not defined for: ${f.path}`,
			);
			buff.push([Renderer.makeLinkAlias(dv, f)]);
		}

		dv.table(cols, buff);
	},

	basicFleeting(dv, data) {
		const cols = ["content", "age", "size"];
		const buff = [];
		for (const d of data) {
			const f = d.file;
			const fm = d.file.frontmatter;
			Assert.True(
				!Helper.nilCheck(fm.uuid),
				`"uuid" id not defined for: ${f.path}`,
			);
			const dt =
				app.plugins.plugins.gonext.api.frontmatter.getCreatedAt(f);
			const now = new Date();
			const delta = now.getTime() - dt.getTime();
			const since = Helper.msecToStringDuration(delta);
			buff.push([Renderer.makeLinkAlias(dv, f), `${since}`, f.size]);
		}

		dv.table(cols, buff);
	},

	basicLog(dv, entry) {
		const cols = ["uuid", "created_at", "project", "area"];
		const logs = dv
			.pages(`"${Paths.Logs}"`)
			.where(
				(p) =>
					p.type === Types.Log &&
					(p.reviewed === undefined || p.reviewed < 1),
			)
			.sort((k) => k.created_at, "asc");

		const buff = [];
		for (const entry of logs) {
			const fm = entry.file.frontmatter;
			const parentId = fm.parent_id;
			if (parentId === undefined) {
				throw new Error(`Invalid log entry: ${entry.file.path}`);
			}

			const parent = dv.pages(`"${Paths.Tasks}/${parentId}"`);
			const parentFm = parent.file.frontmatter;
			const project = Helper.getField(
				Helper.getProject(parentFm, true),
				"",
			);
			const area = Helper.getField(Helper.getArea(parentFm, true), "");
			const createdAt = new Date(fm.created_at);

			buff.push([
				dv.sectionLink(
					entry.file.path,
					"Content",
					false,
					`${fm.uuid.slice(0, 8)}`,
				),
				createdAt.toISOString().slice(0, 10),
				project,
				area,
			]);
		}

		dv.table(cols, buff);
	},

	mediaBase(dv, data) {
		const buff = [];
		const cols = ["uuid", "tasks", "estimate", "area"];
		for (const d of data) {
			const f = d.file;
			const fm = f.frontmatter;
			const area = Helper.getArea(fm);
			buff.push([
				dv.fileLink(f.path, false, fm.uuid.slice(0, 8)),
				dv.markdownTaskList(f.tasks),
				fm.time_estimate,
				area,
			]);
		}

		dv.table(cols, buff);
	},

	praxisBase(dv, data) {
		const buff = [];
		const cols = ["tasks", "uuid", "estimate"];
		for (const d of data) {
			const f = d.file;
			const fm = f.frontmatter;
			buff.push([
				dv.markdownTaskList(f.tasks),
				dv.fileLink(f.path, false, f.name.slice(0, 8)),
				fm.time_estimate,
			]);
		}

		dv.table(cols, buff);
	},

	waitingTask(dv, data) {
		const buff = [];
		const cols = ["tasks", "uuid", "estimate", "cause"];
		for (const d of data) {
			const f = d.file;
			const fm = f.frontmatter;
			buff.push([
				dv.markdownTaskList(f.tasks),
				dv.fileLink(f.path, false, f.name.slice(0, 8)),
				fm.time_estimate,
				fm.cause,
			]);
		}

		dv.table(cols, buff);
	},

	readyTask(dv, data) {
		const buff = [];
		const cols = ["uuid", "task", "estimate", "area"];
		for (const d of data) {
			const f = d.file;
			const fm = f.frontmatter;

			buff.push([
				Renderer.makeLinkAlias(dv, f, "Task"),
				dv.markdownTaskList(f.tasks),
				fm.time_estimate,
				Helper.getField(Helper.getArea(fm, true), "\\-"),
			]);
		}
		dv.table(cols, buff);
	},

	provisionBase(dv, data) {
		const buff = [];
		const cols = ["uuid", "supplier", "content", "estimate"];
		for (const d of data) {
			const f = d.file;
			const fm = f.frontmatter;
			buff.push([
				dv.fileLink(f.path, false, fm.uuid.slice(0, 8)),
				fm.supplier,
				dv.markdownTaskList(f.tasks),
				fm.time_estimate,
			]);
		}
		dv.table(cols, buff);
	},

	basicTask(dv, data) {
		const buff = [];
		const cols = ["uuid", "tasks", "estimate", "domain"];
		for (const d of data) {
			const f = d.file;
			const fm = f.frontmatter;
			const domain =
				Helper.getDomain(fm, true) === undefined
					? "\\-"
					: Helper.getDomain(fm);

			if (fm.ref_id === undefined) {
				// console.log(`name: ${d.file.path}`)
				// console.log(`tasks: ${d.file.tasks.length}`)
				// console.log(`tasksB: ${f.tasks.length}`)
				buff.push([
					dv.fileLink(f.path, false, fm.uuid.slice(0, 8)),
					dv.markdownTaskList(f.tasks),
					fm.time_estimate,
					domain,
				]);
			} else {
				const ref = dv.pages(`"${Paths.Refs}/${fm.ref_id}"`).array();
				if (ref.length === 0) {
					throw new Error(
						`task: '${fm.uuid}' has an undefined ref_id: '${fm.ref_id}'`,
					);
				} else {
					buff.push([
						dv.fileLink(f.path, false, fm.uuid.slice(0, 8)),
						Renderer.makeLinkAlias(dv, ref[0].file),
						fm.time_estimate,
						domain,
					]);
				}
			}
		}
		dv.table(cols, buff);
	},

	logs(dv, entries) {
		const buff = [];
		let totalTime = 0;

		for (const entry of entries) {
			const fme = entry.file.frontmatter;
			const e = [];
			let start = 0;
			let stop = 0;
			if (fme === undefined || fme.created_at === undefined) {
				throw new Error(`Invalid frontmatter: ${fme.uuid}`);
			}

			start = new Date(fme.created_at);
			e.push(start.toISOString().slice(0, 10));
			if (fme.done_at === undefined) {
				stop = Date.now();
			} else {
				stop = new Date(fme.done_at);
			}
			totalTime += stop - start;
			e.push(
				dv.sectionLink(
					fme.uuid,
					"## Content",
					false,
					fme.uuid.slice(0, 8),
				),
			);
			e.push(Math.round(((stop - start) / (1000 * 60 * 60)) * 10) / 10);
			if (fme.reviewed === undefined || fme.reviewed === 0) {
				e.push(0);
			} else {
				e.push(fme.reviewed);
			}
			buff.push(e);
		}

		if (buff.length > 0) {
			dv.header(2, "Logs");
			dv.table(["created_at", "uuid", "session", "reviewed"], buff);
			if (totalTime > 0) {
				dv.paragraph(
					`_totalTime (h):_ ${
						Math.round((totalTime / (1000 * 60 * 60)) * 10) / 10
					}`,
				);
			}
		}
	},

	mediaWithLogs(dv, data) {
		const buff = [];
		const cols = ["uuid", "tasks", "estimate", "current", "domain"];

		for (const d of data) {
			const f = d.file;
			const fm = f.frontmatter;
			const ref = dv.pages(`"${Paths.Refs}/${fm.ref_id}"`).array();
			if (ref.length === 0) {
				throw new Error(
					`task: '${fm.uuid}' has an undefined ref_id: '${fm.ref_id}'`,
				);
			}
			const domain =
				Helper.getDomain(fm, true) === undefined
					? "\\-"
					: Helper.getDomain(fm);
			const logEntries = dv
				.pages(`"${Paths.Logs}/${fm.uuid}"`)
				.where((p) => p.type === Types.Log)
				.sort((k) => k.created_at, "desc");
			let totalTime = 0;
			for (const entry of logEntries) {
				const fme = entry.file.frontmatter;
				const e = [];
				let start = 0;
				let stop = 0;
				if (fme === undefined || fme.created_at === undefined) {
					throw new Error(`Invalid frontmatter: ${fme.uuid}`);
				}

				start = new Date(fme.created_at);
				e.push(start.toISOString().slice(0, 10));
				if (fme.done_at === undefined) {
					stop = Date.now();
				} else {
					stop = new Date(fme.done_at);
				}
				totalTime += stop - start;
			}

			buff.push([
				dv.fileLink(f.path, false, fm.uuid.slice(0, 8)),
				Renderer.makeLinkAlias(dv, ref[0].file),
				fm.time_estimate,
				`${Math.round((totalTime / (1000 * 60 * 60)) * 10) / 10}h`,
				domain,
			]);
		}

		dv.table(cols, buff);
	},

	basicDoneTaskWithLogs(dv, data) {
		const cols = [
			"uuid",
			"createdAt",
			"doneAt",
			"timeEstimate",
			"took",
			"delta",
			"project",
			"area",
		];
		dv.table(cols, data);
	},

	basicDoneTaskWithoutLogs(dv, data) {
		const cols = ["taskId", "createdAt", "project", "area"];
		dv.table(cols, data);
	},

	basicProgressedTaskWithLog(dv, data) {
		const cols = [
			"taskId",
			"logId",
			"createdAt",
			"doneAt",
			"took",
			"tookAcc",
			"deltaAcc",
			"project",
			"area",
		];
		dv.table(cols, data);
	},

	do(dv, rs) {
		for (const row of rs) {
			switch (row[0]) {
				case "header":
					const [, level, heading] = row;
					dv.header(level, heading);
					break;
				case "paragraph":
					const [, text] = row;
					dv.paragraph(text);
					break;
				case "array":
					const [, renderer, data] = row;
					renderer(dv, data);
					break;
				case "stats":
					const [, name, unit, value] = row;
					dv.paragraph(`${name} (${unit}): ${value}`);
					break;
				default:
					throw new Error(`Unsuported opcode: "${opcode}"`);
			}
		}
	},
};

export class Frontmatter {
	gonext: Any;

	constructor(gonext) {
		this.gonext = gonext;
	}

	projectParseMeta(dv) {
		// faute de mieux pour le moment
		const current = dv.current();
		const projectName = current.file.folder.slice(Paths.Projects.length+1);
		const projectDir = current.file.folder;
		if (projectName.contains("/")) {
			throw new Error(`projectDir: ${projectDir} folder: ${current.file.folder}`);
		}

		const pages = dv.pages(`"${projectDir}/meta"`).array();
		if (pages.length !== 1) {
			console.log(pages);
			throw new Error(`len: ${pages.length}`);
		}

		const page = pages[0];
		console.log(page.file.frontmatter)
	}

	getCreatedAt(f): Date {
		return Helper.nilCheck(f.frontmatter.created_at)
			? new Date(f.ctime.ts)
			: new Date(f.frontmatter.created_at);
	}

	getCurrentFrontmatter() {
		const file = this.gonext.workspace.getActiveFile();
		const fileContent = this.gonext.metadataCache.getFileCache(file);
		if (fileContent === undefined) {
			// console.warn("'fileContent' is undefined");
			return undefined;
		}

		const fm = fileContent.frontmatter;
		if (fm === undefined) {
			// console.warn("'fm' is undefined");
			return undefined;
		}

		return fm;
	}

	parseListByNamespace(fm) {
		const byAreas = fm.by_areas === undefined ? [] : fm.by_areas;
		const byContexts = fm.by_contexts === undefined ? [] : fm.by_contexts;
		const byLayers = fm.by_layers === undefined ? [] : fm.by_layers;
		const byOrgs = fm.by_orgs === undefined ? [] : fm.by_orgs;
		const byProjects = fm.by_projects === undefined ? [] : fm.by_projects;

		return [byAreas, byContexts, byLayers, byOrgs, byProjects];
	}

	parseListBeforeAfter(fm) {
		const before = Helper.getDate(fm.before);
		const after = Helper.getDate(fm.after);
		return [before, after];
	}

	parseListFilterBy(fm) {
		if (fm === undefined) {
			return [];
		}

		const filterBy = fm.filter_by;
		if (!Array.isArray(filterBy)) {
			return [];
		}

		return filterBy;
	}

	parseListGroupBy(fm) {
		if (fm === undefined) {
			return "";
		}

		const groupBy = fm.group_by;
		if (
			!(typeof groupBy === "undefined") &&
			!(typeof groupBy === "string")
		) {
			return "";
		}

		return groupBy;
	}

	parseAllProgressedTasks() {
		const fm = this.getCurrentFrontmatter();
		if (fm === undefined) {
			throw new Error(`Invalid frontmatter, cannot proceed`);
		}

		const groupBy = this.parseListGroupBy(fm);
		const filterBy = this.parseListFilterBy(fm);
		const [before, after] = this.parseListBeforeAfter(fm);

		return [groupBy, filterBy, before, after];
	}

	parseAllDoneTasks() {
		return this.parseAllProgressedTasks();
	}

	parseAllDoneTaskWithoutLog() {
		return this.parseAllProgressedTasks();
	}

	parseAllTodoAdHoc() {
		const fm = this.getCurrentFrontmatter();
		if (fm === undefined) {
			throw new Error(`Invalid frontmatter, cannot proceed`);
		}

		const groupBy = this.parseListGroupBy(fm);
		const filterBy = this.parseListFilterBy(fm);
		const [before, after] = this.parseListBeforeAfter(fm);
		const minPriority = Helper.getField(fm.min_priority, 0);

		return [groupBy, filterBy, before, after, minPriority];
	}

	parseInbox() {
		const fm = this.getCurrentFrontmatter();
		if (fm === undefined) {
			return [[], [], 0, 0xffffffff];
		}

		const source = Helper.nilCheck(fm.source)
			? ["logs", "fleeting"]
			: fm.source;
		const groupBy = Helper.nilCheck(fm.group_by) ? "none" : fm.group_by;
		const filterBy = this.parseListFilterBy(fm);
		const minSize = Helper.nilCheck(fm.min_size) ? 0 : fm.min_size;
		const maxSize = Helper.nilCheck(fm.max_size) ? 0xffffffff : fm.max_size;

		return [source, groupBy, filterBy, minSize, maxSize];
	}

	parseJournal() {
		const fm = this.getCurrentFrontmatter();
		if (fm === undefined) {
			return [[], [], [], [], []];
		}
		const [byAreas, byContexts, byLayers, byOrgs, byProjects] =
			this.parseListByNamespace(fm);
		const tasks = Helper.getField(fm.tasks, []);

		return [byAreas, byContexts, byLayers, byOrgs, byProjects, tasks];
	}

	parseTodoList() {
		const fm = this.getCurrentFrontmatter();
		if (fm === undefined) {
			return [[], [], [], [], [], 0];
		}

		const [byAreas, byContexts, byLayers, byOrgs, byProjects] =
			this.parseListByNamespace(fm);
		const minPriority = Helper.getField(fm.min_priority, 0);

		return [byAreas, byContexts, byLayers, byOrgs, byProjects, minPriority];
	}

	parseDoneList() {
		const fm = this.getCurrentFrontmatter();
		if (fm === undefined) {
			return [[], [], [], [], [], [], []];
		}

		const [byAreas, byContexts, byLayers, byOrgs, byProjects] =
			this.parseListByNamespace(fm);
		const [before, after] = this.parseListBeforeAfter(fm);
		const fields = Helper.getField(fm.fields, []);
		const stats = Helper.getField(fm.stats, []);

		return [
			byAreas,
			byContexts,
			byLayers,
			byOrgs,
			byProjects,
			fields,
			stats,
			before,
			after,
		];
	}
}

export class NoteHelper {
	dv: Any;
	gonext: Any;
	frontmatter: Frontmatter;

	constructor(gonext, dv, frontmatter) {
		this.gonext = gonext;
		this.dv = dv;
		this.frontmatter = frontmatter;
	}

	isDoable(task) {
		const fm = task.file.frontmatter;
		if (fm.status !== Status.Todo) {
			return false;
		}

		if (fm.after !== undefined) {
			const after = new Date(fm.after);
			if (Date.now() <= after.getTime()) {
				return false;
			}
		}

		const deps = fm.needs;
		if (deps === undefined || deps.length === 0) {
			return true;
		}

		if (this.hasPendingDependencies(deps)) {
			return false;
		}

		return true;
	}

	hasPendingDependencies(deps) {
		for (const dep of deps) {
			const task = this.dv.pages(`"${Paths.Tasks}/${dep}"`).array();
			if (task.length === 0) {
				console.warn(
					`hasPendingDependencies: "${Paths.Tasks}/${dep}" task does not exists`,
				);
				continue;
			}

			const fm = task[0].file.frontmatter;
			if (
				fm.type !== Types.Task &&
				fm.type !== Types.Provision &&
				fm.type !== Types.Praxis
			) {
				continue;
			}

			if (fm.status === Status.Todo) {
				return true;
			}
		}

		return false;
	}

	isChildTag(parent, child) {
		if (child.length <= parent.length + 1) {
			return false;
		} else if (child.slice(0, parent.length + 1) != `${parent}/`) {
			return false;
		}
		return true;
	}

	getNamespaceContent(ns: string) {
		const children = [];
		const pages = this.dv.pages(`#${ns}`);
		for (const p of pages) {
			const tags = p.file.frontmatter.tags;

			if (tags === undefined || tags.length === 0) {
				continue;
			}

			for (const tag of tags) {
				if (this.isChildTag(ns, tag)) {
					const t = tag.slice(ns.length + 1);
					if (!children.contains(t)) {
						children.push(t);
					}
				}
			}
		}

		return children;
	}
}

export class ListMaker {
	dv: Any;
	gonext: Any;
	frontmatter: Frontmatter;
	noteHelper: NoteHelper;

	constructor(gonext, dv, frontmatter) {
		this.gonext = gonext;
		this.dv = dv;
		this.frontmatter = frontmatter;
		this.noteHelper = new NoteHelper(gonext, dv, frontmatter);
	}

	nameInNamespace(fm: Any, ns: string[]) {
		let found = false;
		if (ns.length === 0) {
			return true;
		}

		for (const a of ns) {
			const root = a.split("/");
			Assert.True(root.length === 2, `Invalid tag: '${a}'`);
			const parent =
				root[0].slice(0, 1) === "!" ? root[0].slice(1) : root[0];
			const name = Helper.getTag(fm, parent);

			if (a.slice(0, 1) === "!") {
				// negative match, discard entry
				if (name === a.slice(1)) {
					return false;
					// no match, reinit
				} else {
					found = true;
				}
			} else {
				// positive match, keep entry
				if (name === a) {
					found = true;
					// no match, reinit
				} else {
					found = false;
				}
			}
		}

		return found;
	}

	myNameInNamespace(name: string, ns: string[]) {
		let found = false;
		if (ns.length === 0) {
			return true;
		}

		for (const a of ns) {
			if (a.slice(0, 1) === "!") {
				// negative match, discard entry
				if (name === a.slice(1)) {
					return false;
					// no match, reinit
				} else {
					found = true;
				}
			} else {
				// positive match, keep entry
				if (name === a) {
					found = true;
					// no match, reinit
				} else {
					found = false;
				}
			}
		}

		return found;
	}

	filterByNamespace(
		fm: Any,
		byAreas: string[],
		byContexts: string[],
		byLayers: string[],
		byOrgs: string[],
		byProjects: string[],
	): bool {
		// if (byAreas.length > 0 && !byAreas.contains(Helper.getArea(fm))) {
		// 	return false;
		// }

		if (!this.myNameInNamespace(Helper.getArea(fm), byAreas)) {
			return false;
		}

		// const area = Helper.getArea(fm);
		// let found = false;
		// for (const a of byAreas) {
		// 	if (a.slice(0, 1) === "!") {
		// 		// negative match, discard entry
		// 		if (area === a.slice(1)) {
		// 			return false;
		// 			// no match, reinit
		// 		} else {
		// 			found = true;
		// 		}
		// 	} else {
		// 		// positive match, keep entry
		// 		if (area === a) {
		// 			found = true;
		// 			// no match, reinit
		// 		} else {
		// 			found = false;
		// 		}
		// 	}
		// }
		//
		// if (!found) {
		// 	return false;
		// }

		// if (
		// 	byContexts.length > 0 &&
		// 	!byContexts.contains(Helper.getContext(fm))
		// ) {
		// 	return false;
		// }
		if (!this.myNameInNamespace(Helper.getContext(fm), byContexts)) {
			return false;
		}

		// if (byLayers.length > 0 && !byLayers.contains(Helper.getLayer(fm))) {
		// 	return false;
		// }
		if (!this.myNameInNamespace(Helper.getLayer(fm), byLayers)) {
			return false;
		}

		// if (byOrgs.length > 0 && !byOrgs.contains(Helper.getOrg(fm))) {
		// 	return false;
		// }
		if (!this.myNameInNamespace(Helper.getOrg(fm), byOrgs)) {
			return false;
		}

		// if (
		// 	byProjects.length > 0 &&
		// 	!byProjects.contains(Helper.getProject(fm))
		// ) {
		// 	return false;
		// }
		if (!this.myNameInNamespace(Helper.getProject(fm), byProjects)) {
			return false;
		}

		return true;
	}

	filterByDate(dt: Date, before: Date, after: Date): bool {
		if (before !== undefined && dt.getTime() > before.getTime()) {
			return false;
		}

		if (after !== undefined && dt.getTime() < after.getTime()) {
			return false;
		}

		return true;
	}

	projectResourceSheet() {
		const curFm = this.frontmatter.getCurrentFrontmatter();
		if (curFm === undefined) {
			return;
		}

		const components = curFm.components;
		const domains = curFm.domains;
		const noteTypes = curFm.types;
		const dropTasks = curFm.drop_status;
		const minMatchingComponent = components.length;

		const rs = {
			fleeting: [],
			literature: [],
			permanent: [],
			task: [],
			praxis: [],
			supply: [],
			log: [],
			resource: [],
			media: [],
		};

		const Types = {
			0: "fleeting",
			1: "literature",
			2: "permanent",
			3: "task",
			4: "praxis",
			5: "supply",
			6: "log",
			7: "resource",
			8: "media",
		};

		const pages = this.dv.pages();
		for (const page of pages) {
			const fm = page.file.frontmatter;
			const tags = fm.tags;
			if (tags === undefined || tags.length === 0) {
				continue;
			}
			const comp = [];
			for (const t of tags) {
				if (t.length > 10 && t.slice(0, 10) === "component/") {
					comp.push(t);
				}
			}
			if (comp.length < components.length) {
				continue;
			}

			let missing = 0;
			for (const component of components) {
				if (!comp.contains(component)) {
					missing += 1;
				}
			}
			if (components.length - missing < minMatchingComponent) {
				continue;
			}

			if (domains.length > 0) {
				let domain = "";
				for (const t of tags) {
					if (t.length > 7 && t.slice(0, 7) === "domain/") {
						domain = t;
						break;
					}
				}
				if (domain === "") {
					console.warn(
						`Missing domain for note: '${page.file.path}'`,
					);
				}
				let found = false;
				for (const d of domains) {
					if (d === domain) {
						found = true;
					}
				}
				if (!found) {
					continue;
				}
			}

			if (Types[fm.type] === undefined) {
				console.warn(`Invalid type for note: '${page.file.path}'`);
				continue;
			}

			if (fm.type === 3 || fm.type === 4 || fm.type === 5) {
				let found = false;
				for (const status of dropTasks) {
					if (fm.status === status) {
						found = true;
						break;
					}
				}
				if (found) {
					continue;
				}
			}

			let found = false;
			for (const t of noteTypes) {
				if (fm.type === t) {
					found = true;
					break;
				}
			}
			if (!found) {
				continue;
			}

			rs[Types[fm.type]].push(page);
		}

		const resources = [];
		const types = Object.keys(rs);
		types.sort();
		for (const t of types) {
			if (rs[t].length === 0) {
				continue;
			}
			resources.push(["header", 2, t]);
			for (const note of rs[t]) {
				resources.push(["paragraph", this.dv.fileLink(note.file.path)]);
			}
		}

		return resources;
	}

	resourceLocatorGlobal() {
		const curFm = this.frontmatter.getCurrentFrontmatter();
		if (curFm === undefined) {
			return;
		}

		const components = [];
		if (Array.isArray(curFm.components)) {
			for (const component of curFm.components) {
				if (component.length > 10 && component.slice(0, 10) === "component/") {
					components.push(component);
				} else {
					components.push(`component/${component}`);
				}
			}
		}

		const domains = [];
		if (Array.isArray(curFm.domains)) {
			for (const domain of curFm.domains) {
				if (domain.length > 7 && domain.slice(0, 7) === "domain/") {
					domains.push(domain);
				} else {
					domains.push(`domain/${domain}`);
				}
			}
		}

		const minMatchingComponent = Helper.nilCheck(curFm.min_matching_components) ? components.length : curFm.min_matching_components;
		const noteTypes = curFm.types;
		const dropTasks = curFm.drop_status;
		// type, component
		// const groupBy = curFm.group_by;
		const groupBy = "type";

		const rs = {
			fleeting: [],
			literature: [],
			permanent: [],
			task: [],
			praxis: [],
			supply: [],
			log: [],
			resource: [],
			media: [],
		};

		const Types = {
			0: "fleeting",
			1: "literature",
			2: "permanent",
			3: "task",
			4: "praxis",
			5: "supply",
			6: "log",
			7: "resource",
			8: "media",
		};

		const pages = this.dv.pages().where((page) => {
			if (
				page.file.frontmatter.type !== undefined &&
				noteTypes.contains(page.file.frontmatter.type)
			) {
				return true;
			}

			return false;
		});

		for (const page of pages) {
			const fm = page.file.frontmatter;
			const tags = fm.tags;
			if (tags === undefined || tags.length === 0) {
				continue;
			}

			const comp = [];
			for (const t of tags) {
				if (t.length > 10 && t.slice(0, 10) === "component/") {
					comp.push(t);
				}
			}
			if (comp.length < components.length) {
				continue;
			}

			let missing = 0;
			for (const component of components) {
				if (!comp.contains(component)) {
					missing += 1;
				}
			}
			if (components.length - missing < minMatchingComponent) {
				continue;
			}

			if (domains.length > 0) {
				let domain = "";
				for (const t of tags) {
					if (t.length > 7 && t.slice(0, 7) === "domain/") {
						domain = t;
						break;
					}
				}

				if (domain === "") {
					console.warn(
						`Missing domain for note: '${page.file.path}'`,
					);
				}
				let found = false;
				for (const d of domains) {
					if (d === domain) {
						found = true;
					}
				}
				if (!found) {
					continue;
				}
			}

			if (Types[fm.type] === undefined) {
				console.warn(`Invalid type for note: '${page.file.path}'`);
				continue;
			}

			if (fm.type === 3 || fm.type === 4 || fm.type === 5 || fm.type === 8) {
				let found = false;
				for (const status of dropTasks) {
					if (fm.status === status) {
						found = true;
						break;
					}
				}

				if (found) {
					continue;
				}
			}

			let found = false;
			for (const t of noteTypes) {
				if (fm.type === t) {
					found = true;
					break;
				}
			}

			if (!found) {
				continue;
			}

			rs[Types[fm.type]].push(page);
		}

		const buff = [];
		const types = Object.keys(rs);
		types.sort();
		for (const t of types) {
			if (rs[t].length === 0) {
				continue;
			}

			rs[t].sort((a, b) => {
				const createdAtA = this.frontmatter.getCreatedAt(a.file);
				const createdAtB = this.frontmatter.getCreatedAt(b.file);
				return createdAtA.getTime() - createdAtB.getTime();
			});

			buff.push(["header", 2, t]);
			buff.push(["array", Renderer.resourceBase, rs[t]]);
		}

		return buff;
	}

	indexAreaDomainMap() {
		const domainMap = {};
		const areaMap = {};

		for (const n of this.dv.pages(`"700 Link/Domains"`).array()) {
			const fm = n.file.frontmatter;
			if (fm.name === undefined || fm.name === null || fm.name === "") {
				throw new Error(`Missing field 'name' for: ${n.file.path}`);
			}

			if (
				fm.areas === undefined ||
				fm.areas === undefined ||
				fm.areas.length === 0
			) {
				throw new Error(`Invalid area note: ${n.file.path}`);
			}

			const domain = `domain/${fm.name}`;

			if (domainMap[domain] === undefined) {
				domainMap[domain] = [];
			}

			for (const area of fm.areas) {
				if (!domainMap[domain].contains(area)) {
					domainMap[domain].push(area);
				}

				if (areaMap[area] === undefined) {
					areaMap[area] = [domain];
				} else {
					areaMap[area].push(domain);
				}
			}
		}
		//
		// const domains = Object.keys(domainMap);
		// domains.sort();
		// for (const domain of domains) {
		//   dv.header(2, domain);
		//   for (const area of domainMap[domain]) {
		//     dv.header(3, area);
		//   }
		// }

		// const areas = Object.keys(areaMap);
		// areas.sort();
		// for (const area of areas) {
		//   dv.header(2, area);
		//   for (const domain of areaMap[area]) {
		//     dv.header(3, domain);
		//   }
		// }

		return [domainMap, areaMap];
	}

	indexCommon(path: string) {
		const bins = {};
		// domainMap domain -> [areas]
		// areaMap area -> [domains]
		const [domainMap, areaMap] = this.indexAreaDomainMap();
		const notes = this.dv.pages(`"${path}"`).array();
		const rs = [];

		for (const n of notes) {
			const fm = n.file.frontmatter;
			if (fm.tags === undefined || fm.tags.length === 0) {
				continue;
			}

			const domain = Helper.getDomain(fm);
			if (domain === "domain/none") {
				// continue;
				throw new Error(`Invalid Node: ${n.file.path}`);
			}

			const components = [];

			for (const t of fm.tags) {
				if (t.length > 10 && t.slice(0, 10) === "component/") {
					components.push(t);
				}
			}

			if (components.length === 0) {
				components.push("component/unknown");
			}

			const areas = domainMap[domain];
			if (areas === undefined) {
				throw new Error(
					`Programming error 'areas' is undefined for domain: '${domain}' note: '${n.file.path}'`,
				);
			}

			for (const a of areas) {
				if (bins[a] === undefined) {
					bins[a] = {};
				}

				for (const d of areaMap[a]) {
					if (bins[a][d] === undefined) {
						bins[a][d] = {};
					}

					if (d !== domain) {
						continue;
					}

					for (const c of components) {
						if (bins[a][d][c] === undefined) {
							bins[a][d][c] = [n];
						} else {
							bins[a][d][c].push(n);
						}
					}
				}
			}
		}

		const areas = Object.keys(bins);
		areas.sort();
		rs.push(["header", 1, "Content"]);

		for (const a of areas) {
			rs.push(["header", 2, a.slice(5)]);
			rs.push(["paragraph", `#${a}`]);
			for (const d of areaMap[a]) {
				rs.push(["header", 3, d.slice(7)]);
				rs.push(["paragraph", `#${d}`]);

				const components = Object.keys(bins[a][d]);
				components.sort();
				for (const c of components) {
					rs.push(["header", 4, c.slice(10)]);
					rs.push(["paragraph", `#${c}`]);
					const tasks = bins[a][d][c];

					for (const t of tasks) {
						rs.push(["paragraph", this.dv.fileLink(t.file.path)]);
					}
				}
			}
		}

		return rs;
	}

	indexResources() {
		return this.indexCommon(Paths.Resources);
	}

	indexContent() {
		return this.indexCommon(Paths.Refs);
	}

	indexKnowledge() {
		const bins = {};

		const [domainMap, areaMap] = this.indexAreaDomainMap();
		const notes = this.dv.pages().array();

		const rs = [];
		for (const n of notes) {
			const fm = n.file.frontmatter;
			const p = n.file.path;

			// console.log(`p: ${p} slice: ${p.slice(0, Paths.Slipbox.length)} slice2: ${p.slice(0, Paths.Resources.length)}`)
			if (
				p.slice(0, Paths.Slipbox.length) !== Paths.Slipbox &&
				p.slice(0, Paths.Resources.length) !== Paths.Resources
			) {
				continue;
			}

			if (fm.tags === undefined || fm.tags.length === 0) {
				continue;
			}

			const domain = Helper.getDomain(fm);
			if (domain === "domain/none") {
				continue;
				// throw new Error(`Invalid Node: ${n.file.path}`);
			}

			const components = [];

			let isContent = false;
			for (const t of fm.tags) {
				if (t.length > 8 && t.slice(0, 8) === "content/") {
					isContent = true;
					break;
				}
				if (t.length > 10 && t.slice(0, 10) === "component/") {
					components.push(t);
				}
			}

			if (isContent) {
				continue;
			}

			if (components.length === 0) {
				components.push("component/unknown");
			}

			if (bins[domain] === undefined) {
				bins[domain] = {};
			}

			for (const c of components) {
				if (bins[domain][c] === undefined) {
					bins[domain][c] = [];
				}
				bins[domain][c].push(n);
			}
		}

		const domains = Object.keys(bins);
		domains.sort();
		rs.push(["header", 1, "Index"]);
		for (const domain of domains) {
			if (domainMap[domain] === undefined) {
				rs.push(["header", 2, "Error"]);
				rs.push(["paragraph", `domain: ${domain} is not in map`]);
				rs.push(["paragraph", `#${domain}`]);
				break;
			}

			for (const area of domainMap[domain]) {
				rs.push(["header", 2, area.slice(5)]);
				rs.push(["paragraph", `#${area}`]);

				rs.push(["header", 3, domain.slice(7)]);
				rs.push(["paragraph", `#${domain}`]);

				const components = Object.keys(bins[domain]);
				components.sort();
				// console.log(`component: ${component.file.path}`);

				for (const component of components) {
					rs.push(["header", 4, component.slice(10)]);
					rs.push(["paragraph", `#${component}`]);
					const tasks = bins[domain][component];

					for (const task of tasks) {
						rs.push([
							"paragraph",
							this.dv.fileLink(task.file.path),
						]);
					}
				}
			}
		}

		return rs;
	}

	allAdHoc() {
		const fml = this.frontmatter.getCurrentFrontmatter();
		if (fml === undefined) {
			throw new Error(`Invalid frontmatter, cannot proceed`);
		}

		const minPriority =
			fml.min_priority === undefined ? 0 : fml.min_priority;
		const journal = this.dv.pages(`"${Paths.Journal}"`)[0].file.frontmatter
			.tasks;

		const rs = [];
		rs.push(["header", 1, "AdHoc"]);

		const bins = {
			doable: [],
			waiting: [],
			journal: [],
			maybe: [],
		};

		const tasks = this.dv.pages(`"${Paths.Tasks}"`).where((page) => {
			const fm = page.file.frontmatter;
			if (page.type !== Types.Task && page.type !== Types.Praxis && page.type !== Types.Media) {
				return false;
			}
			if (Helper.getProject(fm) !== "project/none") {
				return false;
			}
			if (fm.status === Status.Done) {
				return false;
			}
			return true;
		});

		for (const task of tasks) {
			const fm = task.file.frontmatter;

			if (fm.priority !== undefined && fm.priority < minPriority) {
				continue;
			}

			if (journal.contains(fm.uuid)) {
				bins.journal.push(task);
				continue;
			}

			if (this.noteHelper.isDoable(task)) {
				bins.doable.push(task);
			} else if (fm.status === Status.Todo) {
				bins.waiting.push(task);
			} else if (fm.status === Status.Maybe) {
				bins.maybe.push(task);
			}
		}

		// groupBy layer, ??
		if (bins.doable.length > 0) {
			rs.push(["header", 2, `Next Actions (${bins.doable.length})`]);
			bins.doable.sort(
				(a, b) =>
					(a.file.frontmatter.priority -
						b.file.frontmatter.priority) *
					-1,
			);
			rs.push(["array", Renderer.adhocTaskReady, bins.doable]);
			// rs.push(["array", Renderer.basicTask, bins.doable]);
		}

		if (bins.waiting.length > 0) {
			rs.push(["header", 2, `Waiting (${bins.waiting.length})`]);
			const buff = [];
			for (const task of bins.waiting) {
				const fm = task.file.frontmatter;
				if (fm.needs !== undefined && fm.needs.length > 0) {
					fm.cause = fm.needs;
				} else if (fm.after !== undefined) {
					fm.cause = `after: ${fm.after}`;
				} else {
					fm.cause = "unknown";
				}
				buff.push(task);
			}

			rs.push(["array", Renderer.waitingTask, buff]);
		}

		if (bins.maybe.length > 0) {
			rs.push(["header", 2, `Maybe`]);
			bins.doable.sort(
				(a, b) =>
					(a.file.frontmatter.priority -
						b.file.frontmatter.priority) *
					-1,
			);
			rs.push(["array", Renderer.adhocTaskReady, bins.maybe]);
		}

		return rs;
	}

	projectTodo(project: string) {
		const fml = this.frontmatter.getCurrentFrontmatter();
		if (fml === undefined) {
			throw new Error(`Invalid frontmatter, cannot proceed`);
		}
		const minPriority =
			fml.min_priority === undefined ? 0 : fml.min_priority;

		const journal = this.dv.pages(`"${Paths.Journal}"`).array()[0].file
			.frontmatter.tasks;

		if (project === undefined) {
			project = Helper.getProject(fml).slice(8);
		}

		const rs = [];
		rs.push(["header", 1, project]);

		const bins = {
			doable: [],
			waiting: [],
			journal: [],
			maybe: [],
			praxis: [],
		};

		// const tasks = this.dv
		// 	.pages(`#${Namespace.Project}/${project}`)
		// 	.where(
		// 		(page) =>
		// 			page.type === Types.Task && page.status === Status.Todo,
		// 	);

		const tasks = this.dv.pages(`"${Paths.Tasks}"`).where((page) => {
			const fm = page.file.frontmatter;
			if (page.type !== Types.Task && page.type !== Types.Media) {
				return false;
			}
			if (Helper.getProject(fm) !== `${Namespace.Project}/${project}`) {
				return false;
			}
			if (fm.status === Status.Done) {
				return false;
			}
			return true;
		});

		for (const task of tasks) {
			const fm = task.file.frontmatter;

			if (fm.priority !== undefined && fm.priority < minPriority) {
				continue;
			}

			if (journal.contains(fm.uuid)) {
				bins.journal.push(task);
				continue;
			}

			if (this.noteHelper.isDoable(task)) {
				bins.doable.push(task);
			} else if (fm.status === Status.Todo) {
				bins.waiting.push(task);
			} else {
				bins.maybe.push(task);
			}
		}

		// groupBy layer, ??
		if (bins.doable.length > 0) {
			rs.push(["header", 2, `Next Actions (${bins.doable.length})`]);
			bins.doable.sort(
				(a, b) =>
					(a.file.frontmatter.priority -
						b.file.frontmatter.priority) *
					-1,
			);
			rs.push(["array", Renderer.basicTask, bins.doable]);
		}

		if (bins.waiting.length > 0) {
			rs.push(["header", 2, `Waiting (${bins.waiting.length})`]);
			const buff = [];
			for (const task of bins.waiting) {
				const fm = task.file.frontmatter;
				if (fm.needs !== undefined && fm.needs.length > 0) {
					fm.cause = fm.needs;
				} else if (fm.after !== undefined) {
					fm.cause = `after: ${fm.after}`;
				} else {
					fm.cause = "unknown";
				}
				buff.push(task);
			}

			rs.push(["array", Renderer.waitingTask, buff]);
		}

		if (bins.maybe.length > 0) {
			rs.push(["header", 2, `Maybe`]);
			bins.maybe.sort(
				(a, b) =>
					(a.file.frontmatter.priority -
						b.file.frontmatter.priority) *
					-1,
			);
			rs.push(["array", Renderer.readyTask, bins.maybe]);
			// rs.push(["array", Renderer.basicTask, bins.doable]);
		}

		const pages = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where((page) => {
				const fm = page.file.frontmatter;
				if (page.type !== Types.Praxis) {
					return false;
				}
				if (
					Helper.getProject(fm) !== `${Namespace.Project}/${project}`
				) {
					return false;
				}
				if (fm.status === Status.Done) {
					return false;
				}
				return true;
			})
			.array();

		if (pages.length > 0) {
			rs.push(["header", 3, "Praxis"]);
			rs.push(["array", Renderer.praxisBase, pages]);
		}

		return rs;
	}

	projectLogs() {
		const fml = this.frontmatter.getCurrentFrontmatter();
		if (fml === undefined) {
			throw new Error(`Invalid frontmatter, cannot proceed`);
		}
		const project = Helper.getProject(fml).slice(8);
		const filterBy = this.frontmatter.parseListFilterBy(fml);

		const rs = [];
		rs.push(["header", 1, project]);

		const logs = this.dv.pages(`"${Paths.Logs}"`).where((page) => {
			if (page.type !== Types.Log) {
				return false;
			}

			// const f = p.file;
			// const createdAt = this.frontmatter.getCreatedAt(f);
			// const now = new Date();
			// if (createdAt.getTime() + 86400000 - now.getTime() > 0) {
			// 	return false;
			// }
			//
			// if (p.reviewed !== undefined && p.reviewed >= 1) {
			// 	return false;
			// }

			return true;
		});

		const buff = [];
		for (const e of logs) {
			const fm = e.file.frontmatter;
			if (filterBy.length > 0 && !this.nameInNamespace(fm, filterBy)) {
				continue;
			}

			fm.createdAt = this.frontmatter.getCreatedAt(e.file);
			Assert.True(
				!Helper.nilCheck(fm.parent_id),
				`Missing field "parent_id" from log: "${fm.uuid}"`,
			);
			const parent = this.dv
				.pages(`"${Paths.Tasks}/${fm.parent_id}"`)
				.array();
			Assert.True(
				parent.length === 1,
				`Parent: ${fm.parent_id} not found for log: "${fm.uuid}"`,
			);
			fm.project = Helper.getProject(parent[0].file.frontmatter, true);
			fm.area = Helper.getArea(parent[0].file.frontmatter, true);
			if (fm.project !== `project/${project}`) {
				continue;
			}

			// if (fm.reviewed !== undefined && fm.reviewed > 0) {
			// 	continue;
			// }

			buff.push(e);
		}

		buff.sort(
			(a, b) =>
				b.file.frontmatter.createdAt.getTime() -
				a.file.frontmatter.createdAt.getTime(),
		);
		rs.push(["array", Renderer.inboxEntry, buff]);

		return rs;
	}

	allMaybeProjects() {
		const [byAreas, byContexts, byLayers, byOrgs, byProjects, minPriority] =
			this.frontmatter.parseTodoList();
		const fml = this.frontmatter.getCurrentFrontmatter();
		if (fml === undefined) {
			throw new Error(`Invalid frontmatter, cannot proceed`);
		}

		// undefined | null, empty arr, arr 1+ valeurs str
		const filterBy = fml.filter_by;

		// undefined, null || string || empty arr || arr.len 1+[str]
		let groupBy = fml.group_by;
		if (typeof groupBy === "undefined" || groupBy === "") {
			groupBy = "";
		} else if (typeof groupBy === "string") {
		} else {
			throw new Error(`Unsuported implementation groupBy: '${groupBy}'`);
		}

		const projects = this.noteHelper.getNamespaceContent(Namespace.Project);
		projects.sort();
		const rs = [];
		const bins = {};
		rs.push(["header", 1, "Maybe"]);

		const tasks = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where((page) => page.status === Status.Maybe);

		for (const task of tasks) {
			const fm = task.file.frontmatter;
			if (
				filterBy !== undefined &&
				filterBy !== null &&
				filterBy.length > 0
			) {
				if (!this.nameInNamespace(fm, filterBy)) {
					continue;
				}
			}
			const project = Helper.getProject(fm);
			const area = Helper.getArea(fm);

			if (bins[project] === undefined) {
				bins[project] = [task];
			} else {
				bins[project].push(task);
			}
		}

		const keys = Object.keys(bins);
		keys.sort();
		for (const project of keys) {
			if (bins[project].length > 0) {
				rs.push(["header", 2, project]);
				rs.push(["array", Renderer.readyTask, bins[project]]);
			}
		}
		return rs;
	}

	allTodoProjects() {
		const [byAreas, byContexts, byLayers, byOrgs, byProjects, minPriority] =
			this.frontmatter.parseTodoList();
		const fml = this.frontmatter.getCurrentFrontmatter();
		if (fml === undefined) {
			throw new Error(`Invalid frontmatter, cannot proceed`);
		}

		// undefined | null, empty arr, arr 1+ valeurs str
		const filterBy = fml.filter_by;

		// undefined, null || string || empty arr || arr.len 1+[str]
		let groupBy = fml.group_by;
		if (typeof groupBy === "undefined" || groupBy === "") {
			groupBy = "";
		} else if (typeof groupBy === "string") {
		} else {
			throw new Error(`Unsuported implementation groupBy: '${groupBy}'`);
		}

		const today = this.dv.pages(`"${Paths.Journal}"`)[0].file.frontmatter
			.tasks;
		const projects = this.noteHelper.getNamespaceContent(Namespace.Project);
		projects.sort();
		const rs = [];
		rs.push(["header", 1, "Projects"]);

		for (const project of projects) {
			const bins = [];
			if (project === "none") {
				continue;
			}

			const tasks = this.dv
				.pages(`#${Namespace.Project}/${project}`)
				.where(
					(page) =>
						page.type === Types.Task && page.status === Status.Todo,
				);
			let elCount = 0;

			for (const task of tasks) {
				const fm = task.file.frontmatter;
				if (
					filterBy !== undefined &&
					filterBy !== null &&
					filterBy.length > 0
				) {
					if (!this.nameInNamespace(fm, filterBy)) {
						continue;
					}
				}

				if (today.contains(fm.uuid)) {
					continue;
				}

				if (fm.priority !== undefined && fm.priority < minPriority) {
					continue;
				}

				if (this.noteHelper.isDoable(task)) {
					let by = groupBy;
					if (groupBy !== "") {
						by = Helper.getTag(
							task.file.frontmatter,
							groupBy,
							true,
						);
						if (by === undefined) {
							by = "";
						}
					}

					if (bins[by] === undefined) {
						bins[by] = [task];
					} else {
						bins[by].push(task);
					}
					elCount++;
				}
			}

			if (elCount === 0) {
				continue;
			}

			rs.push(["header", 2, project]);
			if (groupBy === "") {
				bins[""].sort(
					(a, b) =>
						a.file.frontmatter.priority -
						b.file.frontmatter.priority,
				);
				rs.push(["array", Renderer.readyTask, bins[""]]);
			} else {
				const keys = Object.keys(bins);
				keys.sort();
				for (const key of keys) {
					// add a header if key != for default value
					if (key !== Helper.getTag({ tags: [] }, groupBy)) {
						rs.push(["header", 3, key]);
					}

					bins[key].sort(
						(a, b) =>
							a.file.frontmatter.priority -
							b.file.frontmatter.priority,
					);
					rs.push(["array", Renderer.readyTask, bins[key]]);
				}
			}
		}

		return rs;
	}

	allDoneTaskWithoutLog() {
		const [
			byAreas,
			byContexts,
			byLayers,
			byOrgs,
			byProjects,
			fields,
			stats,
			before,
			after,
		] = this.frontmatter.parseDoneList();

		const tasks = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where((t) => t.status === Status.Done && t.type === 3);

		const buff = [];
		for (const task of tasks) {
			const fm = task.file.frontmatter;

			const entry = {
				path: task.file.path,
				uuid: fm.uuid,
			};
			if (
				!this.filterByNamespace(
					fm,
					byAreas,
					byContexts,
					byLayers,
					byOrgs,
					byProjects,
				)
			) {
				continue;
			}

			if (fm.created_at === undefined) {
				throw new Error(
					`task: ${fm.uuid} last entry is missing 'done_at' field`,
				);
			}

			entry.createdAt = new Date(fm.created_at);
			if (!this.filterByDate(entry.createdAt, before, after)) {
				continue;
			}

			const logs = this.dv
				.pages(`"${Paths.Logs}/${fm.uuid}"`)
				.sort((k) => k.created_at, "asc");
			// discard tasks with log entry
			if (logs.length > 0) {
				continue;
			}

			let project = Helper.getProject(fm, true);
			if (project === undefined) {
				project = "";
			}
			let area = Helper.getArea(fm, true);
			if (area === undefined) {
				area = "";
			}
			entry.project = project;
			entry.area = area;

			buff.push(entry);
		}

		const bins = {};
		for (const entry of buff) {
			const createdAt = entry.createdAt;
			const d = createdAt.toISOString().slice(0, 10);
			if (bins[d] === undefined) {
				bins[d] = [entry];
			} else {
				bins[d].push(entry);
			}
		}

		const keys = Object.keys(bins);
		keys.sort();

		// builds rendering array
		const rs = [];
		for (const key of keys.reverse()) {
			rs.push(["header", 3, key]);
			const arr = [];

			// day loop
			for (const e of bins[key]) {
				const buff = [];
				buff.push(
					this.dv.sectionLink(
						e.path,
						"Task",
						false,
						`${e.uuid.slice(0, 8)}`,
					),
				);
				buff.push(`${e.createdAt.toISOString().slice(0, 16)}`);
				buff.push(`${e.project}`);
				buff.push(`${e.area}`);
				arr.push(buff);
			}

			// task
			// ["taskId", "createdAt", "project", "area"]
			rs.push(["array", Renderer.basicDoneTaskWithoutLogs, arr]);
		}

		return rs;
	}

	allProgressedTasks() {
		const [groupBy, filterBy, before, after] =
			this.frontmatter.parseAllProgressedTasks();
		const tasks = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where(
				(page) =>
					(page.status === Status.Todo ||
						page.status === Status.Maybe ||
						page.status === Status.Standby) &&
					(page.type === Types.Task || page.type === Types.Praxis),
			);

		const buff = [];
		for (const task of tasks) {
			const fm = task.file.frontmatter;
			if (filterBy.length > 0 && !this.nameInNamespace(fm, filterBy)) {
				continue;
			}

			const timeEstimate = Helper.durationStringToSec(fm.time_estimate);
			if (timeEstimate === undefined && fm.time_estimate !== undefined) {
				throw new Error(
					`Invalid value: "${fm.time_estimate}" for entry: "${fm.uuid}"`,
				);
			} else {
				fm.timeEstimate = timeEstimate;
			}

			const logs = this.dv
				.pages(`"${Paths.Logs}/${fm.uuid}"`)
				.where((page) => page.type === Types.Log)
				.sort((k) => k.created_at, "asc");

			// discard tasks without log entry
			if (logs.length < 1) {
				continue;
			}

			fm.took = 0;
			const project = Helper.getField(Helper.getProject(fm, true), "");
			const area = Helper.getField(Helper.getArea(fm, true), "");

			for (const log of logs) {
				const fml = log.file.frontmatter;
				const entry = {
					alias: fm.alias,
					uuid: fm.uuid,
					logId: fml.uuid,
					estimate: fm.timeEstimate,
					project: project,
					area: area,
					path: task.file.path,
					logPath: log.file.path,
				};
				if (fml.created_at === undefined) {
					console.log(log);
					throw new Error(
						`task: ${fm.uuid} last entry is missing 'created_at' field`,
					);
				}

				if (fml.done_at === undefined) {
					console.log(log);
					throw new Error(
						`task: ${fm.uuid} last entry is missing 'done_at' field`,
					);
				}

				entry.createdAt = new Date(fml.created_at);
				entry.doneAt = new Date(fml.done_at);
				if (!this.filterByDate(entry.doneAt, before, after)) {
					continue;
				}

				const took =
					(entry.doneAt.getTime() - entry.createdAt.getTime()) / 1000;
				fm.took += took;
				entry.took = took;
				entry.tookAcc = fm.took;
				entry.deltaAcc = timeEstimate - fm.took;
				buff.push(entry);
			}
		}

		const keyGetter = Helper.getKey(groupBy);
		const bins = {};
		for (const entry of buff) {
			const d = keyGetter(entry);
			if (bins[d] === undefined) {
				bins[d] = [entry];
			} else {
				bins[d].push(entry);
			}
		}

		const keys = Object.keys(bins);
		keys.sort();

		// builds rendering array
		const rs = [];
		for (const key of keys.reverse()) {
			rs.push(["header", 2, key]);
			const arr = [];
			let totalTime = 0;

			// day loop
			for (const e of bins[key]) {
				const buff = [];
				buff.push(
					this.dv.sectionLink(
						e.path,
						"Task",
						false,
						`${e.uuid.slice(0, 8)}`,
					),
				);
				// buff.push(e.alias !== undefined ? e.alias : "");
				buff.push(
					this.dv.sectionLink(
						e.logPath,
						"Content",
						false,
						`${e.logId.slice(0, 8)}`,
					),
				);
				buff.push(`${e.createdAt.toISOString().slice(0, 16)}`);
				buff.push(`${e.doneAt.toISOString().slice(0, 16)}`);
				const convertSecondsToHours = (t) => {
					return Math.round((t / 3600) * 10) / 10;
				};
				buff.push(`${convertSecondsToHours(e.took)}`);
				buff.push(`${convertSecondsToHours(e.tookAcc)}`);
				buff.push(`${convertSecondsToHours(e.deltaAcc)}`);
				buff.push(`${e.project}`);
				buff.push(`${e.area}`);

				arr.push(buff);
				totalTime += e.took;
			}

			// task
			// ["uuid", "logId", "createdAt", "doneAt", "took", "tookAcc", "deltaAcc", "project", "area"]
			rs.push(["array", Renderer.basicProgressedTaskWithLog, arr]);
			totalTime = Math.round((totalTime / 3600) * 10) / 10;
			rs.push(["stats", "totalTime", "h", totalTime]);
		}

		return rs;
	}

	allDoneTasks() {
		const [groupBy, filterBy, before, after] =
			this.frontmatter.parseAllDoneTasks();
		const tasks = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where((p) => p.status === Status.Done);

		const buff = [];
		for (const task of tasks) {
			const fm = task.file.frontmatter;
			if (filterBy.length > 0 && !this.nameInNamespace(fm, filterBy)) {
				continue;
			}

			const logs = this.dv
				.pages(`"${Paths.Logs}/${fm.uuid}"`)
				.sort((k) => k.created_at, "asc");

			if (logs.length < 1) {
				// console.warn(`task: ${fm.uuid} has no Logs`);
				// throw new Error(`task: ${taskId} has no Logs`);
				continue;
			}

			fm.took = 0;
			for (const log of logs) {
				const fml = log.file.frontmatter;
				const createdAt = new Date(fml.created_at);

				if (createdAt === undefined) {
					throw new Error(
						`task: ${fm.uuid} last entry is missing 'created_at' field`,
					);
				}

				const doneAt = new Date(fml.done_at);
				if (doneAt === undefined) {
					throw new Error(
						`task: ${fm.uuid} last entry is missing 'done_at' field`,
					);
				}

				fm.took += (doneAt.getTime() - createdAt.getTime()) / 1000;
			}
			const firstEntry = logs[0];
			if (firstEntry === undefined) {
				throw new Error(`Programming error 'firstEntry' is undefined`);
			}

			const lastEntry = logs[logs.length - 1];
			if (lastEntry === undefined) {
				throw new Error(`Programming error 'firstEntry' is undefined`);
			}

			fm.doneAt = new Date(lastEntry.file.frontmatter.created_at);
			fm.createdAt = new Date(lastEntry.file.frontmatter.done_at);
			fm.timeEstimate = Helper.durationStringToSec(fm.time_estimate);

			if (!this.filterByDate(fm.doneAt, before, after)) {
				continue;
			}

			buff.push(task);
		}

		const keyGetter = Helper.getKeyFuck(groupBy);
		const bins = {};
		for (const entry of buff) {
			const d = keyGetter(entry);
			if (bins[d] === undefined) {
				bins[d] = [entry];
			} else {
				bins[d].push(entry);
			}
		}

		const keys = Object.keys(bins);
		keys.sort();

		const rs = [];
		for (const key of keys.reverse()) {
			rs.push(["header", 2, key]);
			const arr = [];
			let totalTime = 0;

			for (const e of bins[key]) {
				const buff = [];
				const fm = e.file.frontmatter;
				buff.push(
					this.dv.sectionLink(
						e.file.path,
						"Task",
						false,
						`${fm.uuid.slice(0, 8)}`,
					),
				);
				buff.push(`${fm.createdAt.toISOString().slice(0, 16)}`);
				buff.push(`${fm.doneAt.toISOString().slice(0, 16)}`);
				buff.push(`${fm.timeEstimate}`);
				buff.push(`${fm.took}`);
				let delta = 0;
				if (fm.timeEstimate !== undefined) {
					delta = fm.timeEstimate - fm.took;
				} else {
					delta = undefined;
				}
				buff.push(delta);
				let project = Helper.getProject(fm, true);
				if (project === undefined) {
					project = "";
				}
				buff.push(project);
				let area = Helper.getArea(fm, true);
				if (area === undefined) {
					area = "";
				}
				buff.push(area);

				arr.push(buff);
				totalTime += fm.took;
			}

			// task
			// createdAt, doneAt, uuid, estimate, took, area, project, logEntries
			// JSON.parse(JSON.stringify(buff))
			rs.push(["array", Renderer.basicDoneTaskWithLogs, arr]);
			totalTime = Math.round((totalTime / 3600) * 10) / 10;
			rs.push(["stats", "totalTime", "h", totalTime]);
		}

		return rs;
	}

	inbox() {
		let [source, groupBy, filterBy, minSize, maxSize] =
			this.frontmatter.parseInbox();
		const rs = [];
		const buff = [];
		const bins = {};
		// fonction d'extraction et d'initialisation des paramrtres du frontmatter
		// fonction filter, (task) -> bool

		const fml = this.frontmatter.getCurrentFrontmatter();
		if (fml === undefined) {
			throw new Error(`Invalid frontmatter, cannot proceed`);
		}

		groupBy = fml.group_by;
		if (
			!(typeof groupBy === "undefined") &&
			!(typeof groupBy === "string")
		) {
			throw new Error(`Unsuported implementation groupBy: '${groupBy}'`);
		}
		rs.push(["header", 1, "Inbox"]);

		if (source.contains("fleeting")) {
			const fleetings = this.dv.pages(`"${Paths.Inbox}"`).array();
			for (const e of fleetings) {
				const fm = e.file.frontmatter;
				if (
					filterBy.length > 0 &&
					!this.nameInNamespace(fm, filterBy)
				) {
					continue;
				}

				e.file.frontmatter.createdAt = this.frontmatter.getCreatedAt(
					e.file,
				);
				fm.project = Helper.getProject(fm, true);
				fm.area = Helper.getArea(fm, true);
				if (e.file.size < minSize) {
					continue;
				}
				if (e.file.size > maxSize) {
					continue;
				}

				buff.push(e);
			}
		}

		if (source.contains("logs")) {
			const logs = this.dv.pages(`"${Paths.Logs}"`).where((p) => {
				if (p.type !== Types.Log) {
					return false;
				}

				const f = p.file;
				const createdAt = this.frontmatter.getCreatedAt(f);
				const now = new Date();
				if (createdAt.getTime() + 86400000 - now.getTime() > 0) {
					return false;
				}

				if (p.reviewed !== undefined && p.reviewed >= 1) {
					return false;
				}

				return true;
			});

			for (const e of logs) {
				const fm = e.file.frontmatter;
				if (
					filterBy.length > 0 &&
					!this.nameInNamespace(fm, filterBy)
				) {
					continue;
				}

				fm.createdAt = this.frontmatter.getCreatedAt(e.file);
				Assert.True(
					!Helper.nilCheck(fm.parent_id),
					`Missing field "parent_id" from log: "${fm.uuid}"`,
				);
				const parent = this.dv
					.pages(`"${Paths.Tasks}/${fm.parent_id}"`)
					.array();
				Assert.True(
					parent.length === 1,
					`Parent: ${fm.parent_id} not found for log: "${fm.uuid}"`,
				);
				fm.project = Helper.getProject(
					parent[0].file.frontmatter,
					true,
				);
				fm.area = Helper.getArea(parent[0].file.frontmatter, true);
				if (e.file.size < minSize) {
					continue;
				}
				if (e.file.size > maxSize) {
					continue;
				}

				buff.push(e);
			}
		}

		const sortBySizeThenDate = function (a, b) {
			const fA = a.file;
			const fB = b.file;
			if (fA.size !== fB.size) {
				return fB.size - fA.size;
			} else {
				return (
					fA.frontmatter.createdAt.getTime() -
					fB.frontmatter.createdAt.getTime()
				);
			}
		};
		const sortByAge = (a, b) =>
			a.file.frontmatter.createdAt.getTime() -
			b.file.frontmatter.createdAt.getTime();

		const sortBy = sortByAge;

		if (groupBy == "area") {
			for (const e of buff) {
				const area = e.file.frontmatter.area;
				if (bins[area] === undefined) {
					bins[area] = [e];
				} else {
					bins[area].push(e);
				}
			}
			const keys = Object.keys(bins);
			keys.sort();
			for (const area of keys) {
				bins[area].sort(sortBy);
			}
			for (const area of keys) {
				rs.push([
					"header",
					2,
					area === "undefined" ? "area/none" : area,
				]);
				rs.push(["array", Renderer.inboxEntry, bins[area]]);
			}
		} else if (groupBy == "project") {
			for (const e of buff) {
				const project = e.file.frontmatter.project;
				if (bins[project] === undefined) {
					bins[project] = [e];
				} else {
					bins[project].push(e);
				}
			}
			const keys = Object.keys(bins);
			keys.sort();

			for (const project of keys) {
				bins[project].sort(sortBy);
			}

			for (const project of keys) {
				rs.push([
					"header",
					2,
					project === "undefined" ? "project/none" : project,
				]);
				rs.push(["array", Renderer.inboxEntry, bins[project]]);
			}
		} else {
			buff.sort(sortBy);
			rs.push(["array", Renderer.inboxEntry, buff]);
		}

		return rs;
	}

	praxis() {
		const pages = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where((page) => {
				if (page.file.frontmatter.type !== Types.Praxis) {
					return false;
				}

				if (page.file.frontmatter.status !== Status.Todo) {
					return false;
				}

				return true;
			})
			.array();

		console.log(pages.length);
		const rs = [];
		rs.push(["header", 1, "Praxis"]);
		rs.push(["array", Renderer.basicTask, pages]);

		return rs;
	}

	journal() {
		const [byAreas, byContexts, byLayers, byOrgs, byProjects, fmTasks] =
			this.frontmatter.parseJournal();

		const fm = this.frontmatter.getCurrentFrontmatter();
		if (fmTasks < 1) {
			throw new Error("No tasks !");
		}

		const groupBy = fm.group_by;
		const bins = {
			doable: [],
			waiting: [],
			done: [],
			active: [],
			leisure: [],
			media: [],
		};

		const tasks = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where((k) => fmTasks.contains(k.uuid))
			.sort((k) => k.priority, "desc");
		let totalEstimate = 0;
		for (const task of tasks) {
			const fmt = task.file.frontmatter;

			if (fmt.type === Types.Praxis) {
				const logs = this.dv
					.pages(`"${Paths.Logs}/${fmt.uuid}"`)
					.sort((page) => page.file.frontmatter.created_at, "desc")
					.array();
				if (logs.length > 0) {
					const lastEntry = logs[0];
					const createdAt = this.frontmatter.getCreatedAt(
						lastEntry.file,
					);
					const now = new Date();
					if (
						now.toISOString().slice(0, 10) ===
						createdAt.toISOString().slice(0, 10)
					) {
						bins.done.push(task);
						continue;
					}
				}
			}

			if (Helper.getDomain(fmt) === "domain/leisure") {
				bins.leisure.push(task);
				continue;
			}

			if (fmt.type === Types.Media) {
				bins.media.push(task);
				continue;
			}

			if (this.noteHelper.isDoable(task)) {
				const timeEstimate = fmt.time_estimate;
				if (timeEstimate !== undefined) {
					totalEstimate += Helper.durationStringToSec(timeEstimate);
				}
				bins.doable.push(task);
				continue;
			}

			if (fmt.status === Status.Done) {
				bins.done.push(task);
			} else if (fmt.status !== Status.Doing) {
				bins.waiting.push(task);
			}
		}

		const arr = [];

		arr.push(["header", 1, "Journal"]);
		arr.push(["header", 2, `${fm.tasks.length}/25 tasks`]);
		arr.push([
			"stats",
			"totalEstimate",
			"h",
			`${String(Math.round((totalEstimate / 3600) * 10) / 10).padStart(
				2,
				"0",
			)}`,
		]);

		const doing = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where((page) => page.file.frontmatter.status === Status.Doing)
			.array();

		if (doing.length > 0) {
			arr.push(["header", 2, `Active (${doing.length})`]);
			arr.push(["array", Renderer.basicTask, doing]);
		}

		if (bins.doable.length > 0) {
			arr.push(["header", 2, `Doable (${bins.doable.length})`]);
			if (groupBy !== "" && groupBy !== undefined) {
				const res = {};
				for (const e of bins.doable) {
					const fm = e.file.frontmatter;
					let t = Helper.getTag(fm, groupBy);
					if (
						groupBy === "context" &&
						t === "context/any" &&
						Helper.getOrg(fm) !== "org/none"
					) {
						t = "context/work";
					}
					if (res[t] === undefined) {
						res[t] = [e];
					} else {
						res[t].push(e);
					}
				}

				for (const k of Object.keys(res).sort()) {
					res[k].sort(
						(a, b) =>
							Helper.getField(b.file.frontmatter.priority, 0) -
							Helper.getField(a.file.frontmatter.priority, 0),
					);
					arr.push(["header", 3, k]);
					arr.push(["array", Renderer.basicTask, res[k]]);
				}
			} else {
				bins.doable.sort(
					(a, b) =>
						Helper.getField(b.file.frontmatter.priority, 0) -
						Helper.getField(a.file.frontmatter.priority, 0),
				);
				arr.push(["array", Renderer.basicTask, bins.doable]);
			}
		}

		if (bins.waiting.length > 0) {
			arr.push(["header", 2, `Waiting (${bins.waiting.length})`]);
			const buff = [];
			for (const task of bins.waiting) {
				const fm = task.file.frontmatter;
				if (fm.needs !== undefined && fm.needs.length > 0) {
					fm.cause = fm.needs;
				} else if (fm.after !== undefined) {
					fm.cause = `after: ${fm.after}`;
				} else {
					fm.cause = "unknown";
				}
				buff.push(task);
			}

			arr.push(["array", Renderer.waitingTask, buff]);
		}

		if (bins.media.length > 0) {
			arr.push(["header", 2, `Media (${bins.media.length})`]);
			arr.push(["array", Renderer.mediaWithLogs, bins.media]);
		}

		if (bins.done.length > 0) {
			arr.push(["header", 2, `Done (${bins.done.length})`]);
			arr.push(["array", Renderer.basicTask, bins.done]);
		}

		if (bins.leisure.length > 0) {
			arr.push(["header", 2, `Leisure (${bins.leisure.length})`]);
			arr.push(["array", Renderer.mediaWithLogs, bins.leisure]);
		}

		const provisions = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where((page) => {
				if (page.file.frontmatter.type === undefined) {
					return false;
				}
				if (page.file.frontmatter.type !== Types.Provision) {
					return false;
				}
				if (page.file.frontmatter.status === undefined) {
					return false;
				}
				if (page.file.frontmatter.status !== Status.Todo) {
					return false;
				}
				return true;
			})
			.array();

		if (provisions.length > 0) {
			arr.push(["header", 2, `Provision (${provisions.length})`]);
			arr.push(["array", Renderer.provisionBase, provisions]);
		}

		return arr;
	}
}
