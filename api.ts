import {
	Paths,
	Status,
	Types,
	Namespace,
	Default,
} from "./constants";
import { v4 as uuidv4, v1 as uuidv1 } from "uuid";

export class FrontmatterJS {
	public uuid: string;
	public version: string;
	public type: number;
	public createdAt: Date;
	public at: Date;
	public projects: string[];
	public fm;
	public f;

	singular(values: string[], field: string) {
		if (!Helper.nilCheck(this.fm[field])) {
			const value = this.fm[field];
			if (typeof value === "string") {
				if (!values.contains(value)) {
					values.push(value);
				}
			} else {
				console.warn(
					`'${field}' is ignored, invalid data-type: '${typeof this.fm[field]}'`,
				);
			}
		}
	}

	plural(values: string[], field: string) {
		if (!Helper.nilCheck(this.fm[field])) {
			if (!Array.isArray(this.fm[field])) {
				console.warn(
					`'${field}' is ignored, invalid data-type: '${field}'`,
				);
			} else {
				for (const value of this.fm[field]) {
					if (typeof value === "string") {
						if (!values.contains(value)) {
							values.push(value);
						}
					} else {
						console.warn(
							`'${value}s.${value}' is ignored, invalid data-type: '${typeof value}'`,
						);
					}
				}
			}
		}
	}

	constructor(page) {
		Assert.True(page !== undefined, "'page' is undefined");
		this.f = page.file;
		const f = this.f;
		Assert.True(f !== undefined, "'f' is undefined");
		this.fm = f.frontmatter;
		Assert.True(this.fm !== undefined, "'fm' is undefined");
		Assert.True(
			this.fm.uuid !== undefined,
			`'uuid' is undefined for '${this.f.path}'`,
		);
		// Assert.True(this.fm.version !== undefined, "'version' is undefined");
		// Assert.True(fm.created_at !== undefined, "'created_at' is undefined");

		this.uuid = this.fm.uuid;
		this.version = this.fm.version;
		this.type = this.fm.type;
		this.createdAt = new Date(this.fm.created_at);
		this.at = this.fm.at !== undefined ? new Date(this.fm.at) : new Date();
		const projects = [];

		if (!Helper.nilCheck(this.fm.tags)) {
			if (!Array.isArray(this.fm.tags)) {
				console.warn("'tags' is ignored, invalid data-type");
				this.fm.tags = [];
			}

			for (const tag of this.fm.tags) {
				if (tag.slice(0, 8) === "project/") {
					projects.push(tag.slice(8));
				}
			}
		}

		this.singular(projects, "project");
		this.plural(projects, "projects");

		this.projects = projects;
	}

	getProject(emptyDefault = true): string {
		if (emptyDefault) {
			return this.projects[0];
		} else {
			return this.projects[0] === undefined ? "" : this.projects[0];
		}
	}

	getProjects(): string[] {
		return this.projects;
	}

	resolve(dv) {
		const domains = [];
		for (const domain of this.domains) {
			if (Helper.isUUID(domain)) {
				const pages = dv
					.pages(`"${Paths.Domains}"`)
					.where((page) => page.file.frontmatter.uuid === domain);
				if (pages.length > 1) {
					throw new Error();
				} else if (pages.length === 1) {
					const page = pages[0];
					domains.push(page.file.frontmatter.name);
				}
			} else {
				const pages = dv
					.pages(`"${Paths.Domains}"`)
					.where((page) => page.file.frontmatter.name === domain);
				if (pages.length > 1) {
					throw new Error();
				} else if (pages.length === 1) {
					const page = pages[0];
					domains.push(page.file.frontmatter.name);
				}
			}
		}
		if (domains.length !== this.domains.length) {
			console.warn(`Domain resolution failed for: ${this.domains}`);
		}

		this.domains = domains;
	}
}

class ValidationError extends Error {
	constructor(message) {
		super(message); // (1)
		this.name = "ValidationError"; // (2)
	}
}

export const Assert = {
	True(predicate: boolean, message: string, strict = true) {
		if (!predicate) {
			if (strict) {
				throw new ValidationError(message);
			} else {
				console.error(message);
			}
		}
	},
	False(predicate: boolean, message: string, strict = false) {
		if (predicate) {
			if (strict) {
				throw new ValidationError(message);
			} else {
				console.error(message);
			}
		}
	},
};

export const Helper = {
	nilCheck(val: any): boolean {
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

	numberTypeToString(val): string {
		switch (val.type) {
			case Types.Fleeting:
				return "fleeting";
			case Types.Log:
				return "log";
			case Types.Project:
				return "project";
			case Types.Org:
				return "org";
			case Types.Domain:
				return "domain";
			case Types.Component:
				return "component";
			default:
				throw new Error(
					`numberTypeToString: type: "${val.type}" not implemented "${val.uuid}"`,
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

	getTag(fm, type, emptyDefault = undefined) {
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

	getName(fm): string {
		const components = Helper.getComponents(fm);
		if (components.length < 1) {
			throw new Error(`Helper.getName() ${fm}`);
		}

		let name = undefined;
		let occurences = 0;
		for (const component of components) {
			if (component.slice(0, 15) === "component/name/") {
				name = component.slice(15);
				occurences += 1;
			}
		}

		if (occurences > 1) {
			throw new Error(
				`Helper.getName() ${fm} multiple occurences of 'component/name'`,
			);
		}

		if (name === undefined) {
			throw new Error(
				`Helper.getName() ${fm} 'component/name' undefined`,
			);
		}

		return name;
	},

	getComponents(fm) {
		const components = [];
		if (Helper.nilCheck(fm.tags)) {
			return [];
		}
		for (const tag of fm.tags) {
			if (tag.length > 10 && tag.slice(0, 10) === "component/") {
				components.push(tag);
			}
		}
		return components;
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
		if (val === undefined || val.length === 0) {
			return 0;
		}
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

	msecToStringDuration(val: number) {
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

	isUUID(val: string): boolean {
		if (typeof val !== "string") {
			return false;
		}
		return val.length === 36;
	},

	sortByAge(a, b) {
		const fmA = new FrontmatterJS(a);
		const fmB = new FrontmatterJS(b);

		return fmA.createdAt.getTime() - fmB.createdAt.getTime();
	},

	sortByPriority(a, b) {
		const fmA = new FrontmatterJS(a);
		const fmB = new FrontmatterJS(b);

		return fmB.fm.priority - fmA.fm.priority;
	},

	sortByPriorityAndAge(a, b) {
		const fmA = new FrontmatterJS(a);
		const fmB = new FrontmatterJS(b);

		if (fmA.fm.priority !== fmB.fm.priority.priority) {
			return Helper.sortByPriority(a, b);
		} else {
			return Helper.sortByAge(a, b);
		}
	},

	sortByDuration(a, b) {
		const fmA = new FrontmatterJS(a);
		const fmB = new FrontmatterJS(b);
		return (
			Helper.durationStringToSec(fmA.fm.time_estimate) -
			Helper.durationStringToSec(fmB.fm.time_estimate)
		);
	},

	sortByPriorityAndDuration(a, b) {
		const fmA = new FrontmatterJS(a);
		const fmB = new FrontmatterJS(b);

		if (fmA.fm.priority !== fmB.fm.priority) {
			return Helper.sortByPriority(a, b);
		} else {
			return Helper.sortByDuration(a, b);
		}
	},

	sortByPriorityAndDurationAndAge(a, b) {
		const fmA = new FrontmatterJS(a);
		const fmB = new FrontmatterJS(b);

		if (fmA.fm.priority !== fmB.fm.priority) {
			return Helper.sortByPriority(a, b);
		} else if (fmA.fm.time_estimate !== fmB.fm.time_estimate) {
			return Helper.sortByDuration(a, b);
		} else {
			return Helper.sortByAge(a, b);
		}
	},
};

// this must be called from `dataviewjs` codeblocks
export const Renderer = {
	makeLinkName(dv, f, anchor = "Content") {
		if (Helper.nilCheck(f.frontmatter.name)) {
			return Renderer.makeLinkShortUUID(dv, f, anchor);
		}

		return dv.sectionLink(f.path, anchor, false, `${f.frontmatter.name}`);
	},

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

	makeLink(dv, f, name = undefined, anchor = "Content") {
		return dv.sectionLink(f.path, anchor, false, name);
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
					throw new Error(`Unsuported opcode: "fuckoff"`);
			}
		}
	},
};

export class Frontmatter {
	gonext: any;

	constructor(gonext) {
		this.gonext = gonext;
	}

	projectParseMeta(dv) {
		// faute de mieux pour le moment
		const current = dv.current();
		const projectName = current.file.folder.slice(
			Paths.Projects.length + 1,
		);
		const projectDir = current.file.folder;
		if (projectName.contains("/")) {
			throw new Error(
				`projectDir: ${projectDir} folder: ${current.file.folder}`,
			);
		}

		const pages = dv.pages(`"${projectDir}/meta"`).array();
		if (pages.length !== 1) {
			// console.log(pages);
			throw new Error(`len: ${pages.length}`);
		}

		const fm = pages[0].file.frontmatter;
		const uuid = fm.uuid;
		if (Helper.nilCheck(uuid)) {
			throw new Error(`project 'uuid' is not defined`);
		}

		const name = fm.name;
		if (Helper.nilCheck(name)) {
			throw new Error(`'name' is not defined`);
		}

		const domains = fm.domains;
		if (!Array.isArray(domains)) {
			throw new Error(`'domains' must be of array type`);
		}

		return {
			uuid: uuid,
			name: name,
			domains: domains,
		};
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
	dv: any;
	gonext: any;
	frontmatter: Frontmatter;

	constructor(gonext, dv, frontmatter) {
		this.gonext = gonext;
		this.dv = dv;
		this.frontmatter = frontmatter;
	}

	isDoable(task, at = undefined) {
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

		if (at !== undefined) {
			const fmAt = new Date(fm.at);
			fmAt.setHours(0);
			fmAt.setMinutes(0);
			fmAt.setSeconds(0);

			// if (fm.uuid === "2a97de35-ca87-4267-9159-6c096d4163f1") {
			// 	console.log(`uuid: ${fm.uuid}`);
			// 	console.log(`at: ${at.getTime()}`);
			// 	console.log(`fmAt: ${fmAt.getTime()}`);
			// 	console.log(`if: ${at.getTime() < fmAt.getTime()}`);
			// }

			if (at.getTime() < fmAt.getTime()) {
				return false;
			}
		} else {
			if (fm.at !== undefined) {
				const at = new Date(fm.at);
				if (Date.now() <= at.getTime()) {
					return false;
				}
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

	isLastRevision(page): boolean {
		const revisionList = (dv, root: string, current) => {
			let head = current;
			while (true) {
				const pages = dv
					.pages(`"${root}"`)
					.where(
						(page) =>
							page.file.frontmatter.next ===
							head.file.frontmatter.uuid,
					);
				if (pages.length > 1) {
					throw new Error();
				} else if (pages.length === 0) {
					break;
				}
				head = pages[0];
			}

			const buff = [];
			let cur = head;
			while (true) {
				buff.push(cur);
				const fm = cur.file.frontmatter;
				if (fm.next === undefined) {
					break;
				}
				const pages = dv.pages(`"${root}/${fm.next}"`);
				if (pages.length === 0) {
					break;
				}
				cur = pages[0];
			}

			return buff;
		};

		const note = page;
		const fm = note.file.frontmatter;
		let revisions = [];
		switch (fm.type) {
			case Types.Permanena:
				revisions = revisionList(this.dv, Paths.Slipbox, note);
				break;
			case Types.Resource:
				revisions = revisionList(this.dv, Paths.Resources, note);
				break;
			default:
				throw new Error();
		}

		if (revisions.length <= 1) {
			return true;
		}

		return revisions[0].file.frontmatter.uuid === fm.uuid;
	}
}

export class Generator {
	app: any;
	dv: any;
	gonext: any;

	constructor(app) {
		this.app = app;
		this.dv = app.dv;
		this.gonext = app.gonext;
	}

	action() {
		const dt = new Date();
		const note = {
			uuid: uuidv4(),
			created_at: dt.toISOString(),
			path: "",
			data: "",
		};

		note.path = `${Paths.Tasks}/${note.uuid}.md`;
		note.data = `---\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\n---\n# \n## content\n`;

		const f = this.app.vault.create(note.path, note.data).then((f) => {
			return f;
		});
		const active = this.app.workspace.activeLeaf;
		// @ts-ignore
		const root = active.parent;
		this.app.workspace.createLeafInParent(root, root.children.length + 1);
		const leaf = root.children[root.children.length - 1];
		f.then((file) => {
			leaf.openFile(file, { active: true });
		});
	}

	verbatim(name?: string) {
		const dt = new Date();
		const note = {
			uuid: uuidv4(),
			created_at: dt.toISOString(),
			path: "",
			data: "",
		};

		note.path = `${Paths.Verbatim}/${note.uuid}.md`;
		note.data = `---\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\n---\n# ${name}\n## Content\n`;

		if (name === undefined) {
			note.data = `---\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\n---\n# \n## Content\n`;
		} else {
			note.data = `---\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\n---\n# ${name}\n## Content\n`;
		}

		const f = this.app.vault.create(note.path, note.data).then((f) => {
			return f;
		});
		const active = this.app.workspace.activeLeaf;
		// @ts-ignore
		const root = active.parent;
		this.app.workspace.createLeafInParent(root, root.children.length + 1);
		const leaf = root.children[root.children.length - 1];
		f.then((file) => {
			leaf.openFile(file, { active: true });
		});
	}

	note(name?: string) {
		const dt = new Date();
		const note = {
			uuid: uuidv4(),
			created_at: dt.toISOString(),
			path: "",
			data: "",
		};

		note.path = `${Paths.Slipbox}/${note.uuid}.md`;
		if (name === undefined) {
			note.data = `---\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\n---\n# \n## Content\n`;
		} else {
			note.data = `---\nuuid: "${note.uuid}"\ncreated_at: "${note.created_at}"\n---\n# ${name}\n## Content\n`;
		}

		const f = this.app.vault.create(note.path, note.data).then((f) => {
			return f;
		});
		const active = this.app.workspace.activeLeaf;
		// @ts-ignore
		const root = active.parent;
		this.app.workspace.createLeafInParent(root, root.children.length + 1);
		const leaf = root.children[root.children.length - 1];
		f.then((file) => {
			leaf.openFile(file, { active: true });
		});
	}

}
