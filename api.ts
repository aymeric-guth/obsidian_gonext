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
		if (fm === undefined) {
			throw new Error(`"fm" parameter is required`);
		}

		const tags = fm.tags;
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
		} else {
			throw new Error(`getTag got unsuported type: ${type}`);
		}

		const len = name.length + 1;
		const defaultTag = `${name}/${defaultValue}`;

		let defaultRetVal = defaultTag;
		if (emptyDefault) {
			defaultRetVal = undefined;
		}

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
			console.log(
				`basicFleeting: fm.tags ${fm.tags} fm.project: ${fm.project} fm.area: ${fm.area}`,
			);
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

	basicTask(dv, data) {
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
		console.log(`parseListBeforeAfter: fm.before: ${fm.before}`);
		console.log(`parseListBeforeAfter: fm.after: ${fm.after}`);

		const before = Helper.getDate(fm.before);
		const after = Helper.getDate(fm.after);

		console.log(`parseListBeforeAfter: before: ${before}`);
		console.log(`parseListBeforeAfter: after: ${after}`);

		return [before, after];
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
		const minSize = Helper.nilCheck(fm.min_size) ? 0 : fm.min_size;
		const maxSize = Helper.nilCheck(fm.max_size) ? 0xffffffff : fm.max_size;

		return [source, groupBy, minSize, maxSize];
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
			// console.log(`task: '${task}' typeof task: '${typeof task}' task.length: '${task.length}'`);
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

	nameInNamespace(name: string, ns: string[]) {
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


		if (!this.nameInNamespace(Helper.getArea(fm), byAreas)) {
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
		if (!this.nameInNamespace(Helper.getContext(fm), byContexts)) {
			return false;
		}

		// if (byLayers.length > 0 && !byLayers.contains(Helper.getLayer(fm))) {
		// 	return false;
		// }
		if (!this.nameInNamespace(Helper.getLayer(fm), byLayers)) {
			return false;
		}

		// if (byOrgs.length > 0 && !byOrgs.contains(Helper.getOrg(fm))) {
		// 	return false;
		// }
		if (!this.nameInNamespace(Helper.getOrg(fm), byOrgs)) {
			return false;
		}

		// if (
		// 	byProjects.length > 0 &&
		// 	!byProjects.contains(Helper.getProject(fm))
		// ) {
		// 	return false;
		// }
		if (!this.nameInNamespace(Helper.getProject(fm), byProjects)) {
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

	allTodoAdHoc() {
		const [byAreas, byContexts, byLayers, byOrgs, byProjects, minPriority] =
			this.frontmatter.parseTodoList();
		const today = this.dv.pages(`"${Paths.Journal}"`)[0].file.frontmatter
			.tasks;
		const tasks = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where(
				(page) =>
					page.type === Types.Task &&
					page.status === Status.Todo &&
					Helper.getProject(page.file, true) === undefined,
			);

		const buff = [];

		for (const task of tasks) {
			const fm = task.file.frontmatter;
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

			if (today.contains(fm.uuid)) {
				continue;
			}

			if (fm.priority !== undefined && fm.priority < minPriority) {
				continue;
			}

			if (this.noteHelper.isDoable(task)) {
				buff.push(task);
			}
		}

		const rs = [];

		// ["uuid", "task", "estimate", "area"]
		rs.push(["header", 1, "AdHoc"]);
		rs.push(["array", Renderer.readyTask, buff]);

		return rs;
	}

	allTodoProjects() {
		const [byAreas, byContexts, byLayers, byOrgs, byProjects, minPriority] =
			this.frontmatter.parseTodoList();
		const today = dv.pages(`"Journal"`)[0].file.frontmatter.tasks;
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
			.where(
				(t) =>
					(t.status === Status.Todo ||
						t.status === Status.Maybe ||
						t.status === Status.Standby) &&
					t.type === 3,
			);

		const buff = [];
		for (const task of tasks) {
			const fm = task.file.frontmatter;
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
				.sort((k) => k.created_at, "asc");

			// discard tasks without log entry
			if (logs.length < 1) {
				continue;
			}

			fm.took = 0;
			const project = Helper.getField(Helper.getProject(fm, true), "");
			let area = Helper.getArea(fm, true);
			if (area === undefined) {
				area = "";
			}

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
					throw new Error(
						`task: ${fm.uuid} last entry is missing 'created_at' field`,
					);
				}

				if (fml.done_at === undefined) {
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
			.where((p) => p.status === Status.Done);

		const buff = [];
		for (const task of tasks) {
			const fm = task.file.frontmatter;
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
				throw new Error(`Programming error "firstEntry" is undefined`);
			}

			const lastEntry = logs[logs.length - 1];
			if (lastEntry === undefined) {
				throw new Error(`Programming error "firstEntry" is undefined`);
			}

			fm.doneAt = new Date(lastEntry.file.frontmatter.created_at);
			fm.createdAt = new Date(lastEntry.file.frontmatter.done_at);
			fm.timeEstimate = Helper.durationStringToSec(fm.time_estimate);
			buff.push(task);
		}

		const bins = {};
		for (const entry of buff) {
			const doneAt = entry.file.frontmatter.doneAt;
			const d = doneAt.toISOString().slice(0, 10);
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
			rs.push(["header", 3, key]);
			// this.dv.header(3, key);
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
			console.log(`arr: ${arr}`);
			// JSON.parse(JSON.stringify(buff))
			rs.push(["array", Renderer.basicDoneTaskWithLogs, arr]);
			totalTime = Math.round((totalTime / 3600) * 10) / 10;
			console.log(`totalTime: ${totalTime}`);
			rs.push(["stats", "totalTime", "h", totalTime]);
		}

		return rs;
	}

	inbox() {
		const [source, groupBy, minSize, maxSize] =
			this.frontmatter.parseInbox();
		const rs = [];
		const buff = [];
		const bins = {};

		rs.push(["header", 1, "Inbox"]);

		if (source.contains("fleeting")) {
			const fleetings = this.dv.pages(`"${Paths.Inbox}"`).array();
			for (const e of fleetings) {
				const fm = e.file.frontmatter;
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
				bins[area].sort((a, b) => {
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
				});
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
				bins[project].sort((a, b) => {
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
				});
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
			buff.sort((a, b) => {
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
			});
			rs.push(["array", Renderer.inboxEntry, buff]);
		}

		return rs;
	}

	journal() {
		const [byAreas, byContexts, byLayers, byOrgs, byProjects, fmTasks] =
			this.frontmatter.parseJournal();

		const fm = this.frontmatter.getCurrentFrontmatter();
		if (fmTasks < 1) {
			throw new Error("No tasks !");
		}

		const ctx = [];
		const bins = {
			doable: [],
			waiting: [],
			done: [],
			active: [],
		};
		const tasks = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where((k) => fmTasks.contains(k.uuid))
			.sort((k) => k.priority, "desc");
		let totalEstimate = 0;
		for (const task of tasks) {
			const fmt = task.file.frontmatter;
			if (
				!this.filterByNamespace(
					fmt,
					byAreas,
					byContexts,
					byLayers,
					byOrgs,
					byProjects,
				)
			) {
				continue;
			}

			const c = Helper.getContext(fmt);
			if (!ctx.contains(c)) {
				ctx.push(c);
			}

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

			if (this.noteHelper.isDoable(task)) {
				const timeEstimate = fmt.time_estimate;
				if (timeEstimate !== undefined) {
					totalEstimate += Helper.durationStringToSec(timeEstimate);
				}
				bins.doable.push(task);
				continue;
			}

			if (task.file.frontmatter.status === Status.Done) {
				bins.done.push(task);
			} else {
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
			bins.doable.sort(
				(a, b) =>
					Helper.getField(b.file.frontmatter.priority, 0) -
					Helper.getField(a.file.frontmatter.priority, 0),
			);
			arr.push(["header", 2, `Doable (${bins.doable.length})`]);
			arr.push(["array", Renderer.basicTask, bins.doable]);
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

		if (bins.done.length > 0) {
			arr.push(["header", 2, `Done (${bins.done.length})`]);
			arr.push(["array", Renderer.basicTask, bins.done]);
		}

		return arr;
	}

	getNamespaceContent(dv, ns) {
		const children = [];
		const resp = this.dv.pages(`#${ns}`);
		for (const f of resp) {
			const tags = f.tags;
			if (tags === undefined) {
				continue;
			}

			for (const tag of tags) {
				console.log(`tag: ${tag}`);
				if (Helper.isChildTag(ns, tag)) {
					const t = tag.slice(ns.length + 1);
					if (!children.includes(t)) {
						children.push(t);
					}
				}
			}
		}

		return children;
	}
}
