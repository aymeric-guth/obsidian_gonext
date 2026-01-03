import {
	Paths,
	Status,
	Types,
	Namespace,
	Default,
	GoalStatus,
} from "./constants";
import { v4 as uuidv4, v1 as uuidv1 } from "uuid";

export class FrontmatterJS {
	public uuid: string;
	public version: string;
	public type: number;
	public createdAt: Date;
	public at: Date;
	public before: Date;
	public after: Date;
	public components: string[];
	public domains: string[];
	public names: string[];
	public projects: string[];
	public fm;
	public contents: string[];
	public traits: string[];
	public contexts: string[];
	public status: string;
	public f;
	public energy: number;

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
		this.before =
			this.fm.before !== undefined
				? new Date(this.fm.before)
				: new Date();
		this.after =
			this.fm.after !== undefined ? new Date(this.fm.after) : new Date();
		this.components = [];
		this.domains = [];
		this.projects = [];
		this.contexts = [];
		this.traits = [];
		this.energy = this.fm.energy !== undefined ? this.fm.energy : 9;

		const domains = [];
		const components = [];
		const projects = [];
		const names = [];
		const contexts = [];
		const contents = [];
		const traits = [];

		if (!Helper.nilCheck(this.fm.tags)) {
			if (!Array.isArray(this.fm.tags)) {
				console.warn("'tags' is ignored, invalid data-type");
				this.fm.tags = [];
			}

			for (const tag of this.fm.tags) {
				if (tag.slice(0, 7) === "domain/") {
					domains.push(tag.slice(7));
				} else if (tag.slice(0, 10) === "component/") {
					components.push(tag.slice(10));
				} else if (tag.slice(0, 8) === "project/") {
					projects.push(tag.slice(8));
				} else if (tag.slice(0, 5) === "name/") {
					names.push(tag.slice(5));
				} else if (tag.slice(0, 8) == "context/") {
					contexts.push(tag.slice(8));
				} else if (tag.slice(0, 8) == "content/") {
					contents.push(tag.slice(8));
				} else if (tag.slice(0, 6) == "trait/") {
					traits.push(tag.slice(6));
				}
			}
		}

		this.singular(domains, "domain");
		this.plural(domains, "domains");
		this.singular(components, "components");
		this.plural(components, "components");
		this.singular(projects, "project");
		this.plural(projects, "projects");
		this.singular(contents, "contents");
		this.plural(contents, "contents");
		this.singular(names, "name");
		this.plural(names, "names");
		this.plural(names, "alias");
		this.singular(traits, "trait");
		this.plural(traits, "traits");

		this.domains = domains;
		this.components = components;
		this.projects = projects;
		this.names = names;
		this.contexts = contexts;
		this.contents = contents;
		this.traits = traits;
	}

	getDomain(emptyDefault = true): string {
		if (emptyDefault) {
			return this.domains[0];
		} else {
			return this.domains[0] === undefined ? "unknown" : this.domains[0];
		}
	}

	getDomains(): string[] {
		return this.domains;
	}

	getTraits(): string[] {
		return this.traits;
	}

	getComponents(): string[] {
		return this.components;
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

	getName(emptyDefault = true): string {
		if (emptyDefault) {
			return this.names[0];
		} else {
			return this.names[0] === undefined ? "" : this.names[0];
		}
	}

	getContent(emptyDefault = true): string {
		if (emptyDefault) {
			return this.contents[0];
		} else {
			return this.contents[0] === undefined ? "" : this.contents[0];
		}
	}

	getNames(): string[] {
		return this.names;
	}

	getContext(emptyDefault = true): string {
		if (emptyDefault) {
			return this.contexts[0];
		} else {
			return this.contexts[0] === undefined ? "" : this.contexts[0];
		}
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

export class ListMaker {
	dv: any;
	gonext: any;
	frontmatter: Frontmatter;
	noteHelper: NoteHelper;

	constructor(gonext, dv, frontmatter) {
		this.gonext = gonext;
		this.dv = dv;
		this.frontmatter = frontmatter;
		this.noteHelper = new NoteHelper(gonext, dv, frontmatter);
	}


	planning(lastWeek = 1) {
		const rs = [];
		const pages = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where((page) => {
				const fm = new FrontmatterJS(page);
				if (fm.at === undefined) {
					return false;
				}

				return true;
			})
			.sort((page) => page.file.frontmatter.at, "desc");
		const now = new Date();
		// const now = new Date("2024-12-31");
		const bins = {};
		for (const page of pages) {
			const fm = new FrontmatterJS(page);
			let at = undefined;
			try {
				at = fm.at.toISOString().slice(0, 10);
			} catch {
				throw new Error(`Invalid date: '${fm.fm.uuid}'`);
			}

			const weekNumber = this.getWeekNumber5(fm.at);
			if (fm.at.getFullYear() < now.getFullYear()) {
				if (weekNumber > 1) {
					continue;
				}
			}
			// const weekNumber = this.getWeekNumber(fm.at);
			if (bins[weekNumber] === undefined) {
				bins[weekNumber] = [fm];
			} else {
				bins[weekNumber].push(fm);
			}
		}

		const currentWeekNumber = this.getWeekNumber5(now);
		// const currentWeekNumber = this.getWeekNumber(now);
		for (const key of Object.keys(bins)) {
			const weekNumber = Number(key);
			if (weekNumber + lastWeek < currentWeekNumber) {
				continue;
			}
			if (weekNumber < currentWeekNumber) {
				rs.push(["header", 2, `~~week ${key}~~`]);
			} else if (weekNumber === currentWeekNumber) {
				rs.push(["header", 2, `*week ${key}*`]);
			} else {
				rs.push(["header", 2, `week ${key}`]);
			}

			bins[key].sort((a, b) => {
				return a.at.getTime() - b.at.getTime();
			});

			for (const task of bins[key]) {
				const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
					task.at.getDay()
				];
				const text = Renderer.makeLink(
					this.dv,
					task.f,
					`${task.at.toISOString().slice(0, 10)}, ${day}`,
					"Task",
				);

				if (weekNumber < currentWeekNumber) {
					rs.push(["paragraph", `~~${text}~~`]);
				} else if (weekNumber === currentWeekNumber) {
					if (this.dayOfYear(task.at) < this.dayOfYear(now)) {
						rs.push(["paragraph", `~~${text}~~`]);
					} else {
						rs.push(["paragraph", `${text}`]);
					}
				} else {
					rs.push(["paragraph", `${text}`]);
				}
			}
		}

		return rs;
	}

	dayOfYear(dt): number {
		const year = dt.getFullYear();
		const month = dt.getMonth() + 1;
		const day = dt.getDate();

		const N1 = Math.floor((275 * month) / 9);
		const N2 = Math.floor((month + 9) / 12);
		const N3 = 1 + Math.floor((year - 4 * Math.floor(year / 4) + 2) / 3);
		return N1 - N2 * N3 + day - 30;
	}

	getWeekNumber(d) {
		// Copy date so don't modify original
		d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
		// Set to nearest Thursday: current date + 4 - current day number
		// Make Sunday's day number 7
		d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
		// Get first day of year
		const yearStart: any = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		// Calculate full weeks to nearest Thursday
		return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
	}

	// https://codepen.io/ldijkman/pen/LYdNJvM
	getWeekNumber5(dt) {
		// @ts-ignore
		const tdt = new Date(dt.valueOf());
		// const dayn = (dt.getDay() + 6) % 7;
		const dayn = dt.getDay();
		// @ts-ignore
		tdt.setDate(tdt.getDate() - dayn + 3);
		// @ts-ignore
		const firstThursday = tdt.valueOf();
		// @ts-ignore
		tdt.setMonth(0, 1);
		// @ts-ignore
		if (tdt.getDay() !== 4) {
			tdt.setMonth(0, 1 + ((4 - tdt.getDay() + 7) % 7));
		}
		// @ts-ignore
		return 1 + Math.ceil((firstThursday - tdt) / 604800000);
	}

	getWeekNumber4(d) {
		// @ts-ignore
		d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
		// @ts-ignore
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		// @ts-ignore
		const firstSunday =
			yearStart.getUTCDay() === 0
				? yearStart
				: new Date(
					Date.UTC(
						d.getUTCFullYear(),
						0,
						1 + (7 - yearStart.getUTCDay()),
					),
				);
		// @ts-ignore
		const daysSinceFirstSunday = (d - firstSunday + 86400000) / 86400000;
		// @ts-ignore
		return Math.ceil(daysSinceFirstSunday / 7);
	}

	getMonth(year, weekNumber) {
		// Create a date object for the first day of the year
		const firstDayOfYear = new Date(year, 0, 1);

		// Determine the day of the week for the first day of the year
		const firstDayOfWeek = firstDayOfYear.getDay();

		// Calculate the number of days to add to the first day of the year
		// to get to the start of the specified week
		// Weeks start on Monday; if the first day of the year is a Monday,
		// no adjustment is needed, otherwise adjust to the next Monday
		const daysToAdd =
			(weekNumber - 1) * 7 -
			firstDayOfWeek +
			(firstDayOfWeek === 0 ? 1 : 0);

		// Adjust the date to the start of the specified week
		const weekStartDate = new Date(
			firstDayOfYear.setDate(firstDayOfYear.getDate() + daysToAdd),
		);

		// Check if the weekStartDate is on the last day of the month,
		// if so, move to the next month to round up for a week that spans a month transition
		if (weekStartDate.getDate() > 24) {
			weekStartDate.setDate(weekStartDate.getDate() + 7);
		}

		// Extract the month number (0-11 for Jan-Dec) from the weekStartDate
		const monthNumber = weekStartDate.getMonth();

		return monthNumber + 1; // Return month number (1-12)
	}

	getMonthName(monthNumber) {
		const date = new Date(2000, monthNumber - 1); // Year 2000 is used arbitrarily; any non-leap year will do
		return date.toLocaleString("default", { month: "long" });
	}
}
