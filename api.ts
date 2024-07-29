import { assert, group, time } from "console";
import { unzip } from "zlib";
import { Paths, Status, Types, Namespace, Default } from "./constants";

class FilterBy {
	public fm: any;
	public predicates: string[];
	public contexts: string[];

	constructor(fm: any) {
		this.fm = fm;
		if (fm === undefined) {
			this.predicates = [];
		} else {
			this.predicates = Array.isArray(fm.filter_by) ? fm.filter_by : [];
		}
	}

	nameInNamespace(fm: any, ns: string[]) {
		let found = false;
		if (ns.length === 0) {
			return true;
		}

		for (const a of ns) {
			const root = a.split("/");
			Assert.True(root.length === 2, `Invalid tag: '${a}'`);
			const parent =
				root[0].slice(0, 1) === "!" ? root[0].slice(1) : root[0];
			// console.log(parent)
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

	filter(fm: any) {
		if (this.predicates.length == 0) {
			return false;
		}
		return !this.nameInNamespace(fm, this.predicates);
	}
}

class FrontmatterJS {
	public uuid: string;
	public version: string;
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
	True(predicate: boolean, message: string) {
		if (!predicate) {
			throw new ValidationError(message);
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
};

export const AutoField = {
	tags(dv, fm, level = 2) {
		const tags = fm.tags;
		if (tags == undefined || tags.length === 0) {
			return;
		}

		tags.sort();
		dv.header(level, "Tags");
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
			let start: any = 0;
			let stop: any = 0;
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
					`_totalTime (h):_ ${Math.round((totalTime / (1000 * 60 * 60)) * 10) / 10
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
		AutoField.tags(dv, mediaFm, 3);

		const logEntries = dv
			.pages(`"${Paths.Logs}/${fm.uuid}"`)
			.where((p) => p.type === 6)
			.sort((k) => k.created_at, "desc");
		AutoField.logs(dv, logEntries);
	},

	autoFieldTitle(dv, fm) {
		const title = fm.alias;
		if (title == undefined) {
			return;
		}

		dv.header(1, title);
	},

	autoFieldAuthors(dv, fm) {
		const authors = fm.authors;
		if (authors === undefined || authors.length === 0) {
			return;
		}
		dv.header(2, "Authors");
		dv.list(authors);
	},

	autoFieldTags(dv, fm) {
		const tags = fm.tags;
		if (tags == undefined || tags.length === 0) {
			return;
		}

		tags.sort();
		dv.header(2, "Tags");
		let s = "";
		for (const tag of tags) {
			s += ` #${tag}`;
		}
		dv.paragraph(s);
	},

	literature(dv) {
		const current = dv.current();
		const fm = current.file.frontmatter;
		if (fm === undefined) {
			return;
		}
		if (Helper.nilCheck(fm.authors)) {
		} else {
			this.autoFieldTitle(dv, fm);
			this.autoFieldAuthors(dv, fm);
			this.autoFieldTags(dv, fm);
		}
	},

	goal(dv) {
		const current = dv.current();
		const fm = current.file.frontmatter;
		if (fm === undefined) {
			console.warn("fm is required");
			return;
		}

		// this.autoFieldNeed(dv, fm);
		// this.autoFieldNeededBy(dv, current);
		// this.autoFieldTags(dv, fm);
		//
		const created_at = new Date(fm.created_at);
		const logEntries = dv
			.pages(`"${Paths.Logs}/${fm.uuid}"`)
			.where((p) => p.type === 6)
			.sort((k) => k.created_at, "desc");

		const buff = [];
		for (const entry of logEntries) {
			const fme = entry.file.frontmatter;
			const e = [];

			if (fme === undefined || fme.created_at === undefined) {
				throw new Error(`Invalid frontmatter: ${fme.uuid}`);
			}

			const start = new Date(fme.created_at);
			e.push(start.toISOString().slice(0, 10));

			e.push(
				dv.sectionLink(
					fme.uuid,
					"## Content",
					false,
					fme.uuid.slice(0, 8),
				),
			);

			buff.push(e);
		}

		const before = new Date(fm.before);
		// days
		const timeframe =
			(before.getTime() - created_at.getTime()) / (1000 * 3600 * 24);
		let timeframeText = "";
		// 1 jour
		// 1 semaine
		// 2 semaine
		// 1 mois
		// 2 mois
		// 6 mois
		// 1 an
		// 2 ans
		// 5 ans
		dv.header(3, "Timeframe");
		if (timeframe > 0 && timeframe < 30) {
			timeframeText = "runaway";
		} else if (timeframe < 60) {
			timeframeText = "10,000 feet";
		} else if (timeframe < 360) {
			timeframeText = "20,000 feet";
		} else if (timeframe < 720) {
			timeframeText = "30,000 feet";
		} else if (timeframe < 1080) {
			timeframeText = "40,000 feet";
		} else {
			timeframeText = "50,000 feet";
		}

		dv.paragraph(timeframeText);

		if (buff.length > 0) {
			dv.header(2, "Reviews");
			dv.table(["reviewed_at", "uuid"], buff);
		}
	},

	calendar(dv) {
		const current = dv.current().file.frontmatter;
		const currentAt = new Date(current.at);
		const currentAtShort = currentAt.toISOString().slice(0, 10);

		const pages = dv
			.pages(`"Calendar"`)
			.where((page) => {
				const fm = page.file.frontmatter;
				if (fm.completed === true) {
					return false;
				}

				const now = new Date();
				if (fm.date !== currentAtShort) {
					return false;
				}

				if (fm.completed === false) {
					return true;
				} else {
					return true;
				}
			})
			.sort((k) => k.at, "asc");

		if (pages.length === 0) {
			return;
		}

		const buff = [];
		for (const page of pages) {
			const fm = page.file.frontmatter;
			buff.push([`${fm.startTime} - ${fm.endTime}`, `${fm.title}`]);
		}

		console.log(pages.length);
		dv.table(["at", "title"], buff);
	},

	daily(dv) {
		const current = dv.current().file.frontmatter;
		const currentAt = new Date(current.at);
		const currentAtShort = currentAt.toISOString().slice(0, 10);

		const pages = dv
			.pages(`"${Paths.Tasks}"`)
			.where((page) => {
				// if (page.file.frontmatter.at === undefined) {
				// 	return false;
				// }

				const fm = new FrontmatterJS(page);
				if (current.uuid === fm.uuid) {
					return false;
				}

				if (fm.fm.status !== "todo" || fm.getProject() === "daily") {
					return false;
				}

				const now = new Date();
				if (
					page.file.frontmatter.at !== undefined &&
					fm.at.toISOString().slice(0, 10) === currentAtShort
				) {
					return true;
				}

				if (
					page.file.frontmatter.at !== undefined &&
					fm.at.getTime() < now.getTime()
				) {
					return true;
				}

				if (
					page.file.frontmatter.before !== undefined &&
					fm.before.getTime() > now.getTime()
				) {
					return true;
				}

				if (
					page.file.frontmatter.after !== undefined &&
					fm.after.getTime() < now.getTime()
				) {
					return true;
				}

				return false;
			})
			.sort((k) => k.at, "asc");

		if (pages.length === 0) {
			return;
		}

		const buff = [];
		for (const page of pages) {
			const fm = new FrontmatterJS(page);
			const h = String(fm.at.getHours()).padStart(2, "0");
			const m = String(fm.at.getMinutes()).padStart(2, "0");
			if (page.file.frontmatter.status === "done") {
				buff.push([
					`~~${Renderer.makeLinkShortUUID(dv, page.file, "Task")}~~`,
					`~~${h}:${m}~~`,
				]);
			} else {
				buff.push([
					`${Renderer.makeLinkShortUUID(dv, page.file, "Task")}`,
					`${h}:${m}`,
				]);
			}
		}
		dv.table(["uuid", "at"], buff);
	},

	task(dv) {
		const dvLib = new DvLib();
		dvLib.autoFieldTask(dv);
	},

	log(dv) {
		const dvLib = new DvLib();
		dvLib.autoFieldLog(dv);
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

	projectLogs(dv, data) {
		const cols = ["type", "task_id", "log_id", "took", "reviewed"];
		const buff = [];
		let totalTime = 0;

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

			const createdAt = new Date(fm.created_at);
			const doneAt = new Date(fm.done_at);
			const delta = doneAt.getTime() - createdAt.getTime();

			totalTime += delta;
			const record = {
				taskId: "",
				logId: Renderer.makeLinkAlias(dv, f),
				took: Math.round((delta / (1000 * 60 * 60)) * 10) / 10,
				reviewed: Helper.nilCheck(fm.reviewed) ? 0 : fm.reviewed,
				type: undefined,
			};
			const pages = dv.pages(`"${Paths.Tasks}/${fm.parent_id}"`).array();
			if (pages.length !== 1) {
				throw new Error(
					`parent task with id: "${fm.parent_id}" does not exists`,
				);
			}
			const parent = pages[0];
			switch (parent.file.frontmatter.type) {
				case Types.Task:
					record.type = `<font color=8B0000>task</font>`;
					record.taskId = Renderer.makeLinkShortUUID(
						dv,
						parent.file,
						"Task",
					);
					break;
				case Types.Media:
					record.type = `<font color=00008B>media</font>`;
					record.taskId = Renderer.makeLinkShortUUID(
						dv,
						parent.file,
						"Content",
					);
					break;
				case Types.Praxis:
					record.type = `<font color=FF8C00>praxis</font>`;
					record.taskId = Renderer.makeLinkShortUUID(
						dv,
						parent.file,
						"Content",
					);
					break;
				case Types.Provision:
					record.type = `<font color=DC143C>provision</font>`;
					record.taskId = Renderer.makeLinkShortUUID(
						dv,
						parent.file,
						"Content",
					);
					break;
				default:
					throw new Error(
						`Renderer.projectLogs: type "${parent.file.frontmatter.type}" not implemented`,
					);
			}
			buff.push([
				record.type,
				record.taskId,
				record.logId,
				record.took,
				record.reviewed,
			]);
		}

		dv.table(cols, buff);
		// Math.round((totalTime / (1000 * 60 * 60)) * 10) / 10,
	},

	goal(dv, data) {
		const buff = [];
		for (const fm of data) {
			const created_at = fm.createdAt;
			const logEntries = dv
				.pages(`"${Paths.Logs}/${fm.uuid}"`)
				.where((p) => p.type === 6)
				.sort((k) => k.created_at, "desc");
			const before = new Date(fm.fm.before);

			const timeframe =
				(before.getTime() - created_at.getTime()) / (1000 * 3600 * 24);
			let timeframeText = "";
			if (timeframe > 0 && timeframe < 30) {
				timeframeText = "runaway";
			} else if (timeframe < 60) {
				timeframeText = "10,000 feet";
			} else if (timeframe < 360) {
				timeframeText = "20,000 feet";
			} else if (timeframe < 720) {
				timeframeText = "30,000 feet";
			} else if (timeframe < 1080) {
				timeframeText = "40,000 feet";
			} else {
				timeframeText = "50,000 feet";
			}

			buff.push([
				before.toISOString().slice(0, 10),
				dv.sectionLink(
					fm.uuid,
					"## Content",
					false,
					fm.uuid.slice(0, 8),
				),
				fm.getDomain(),
				timeframeText,
			]);
		}

		dv.table(["deadline", "uuid", "domain", "timeframe"], buff);
	},

	inboxEntry(dv, data) {
		const cols = [
			"uuid",
			// "type",
			// "age",
			// "size",
			"name",
			// "project",
			// "domain",
			// "components",
		];
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
			let name = "";

			console.log("\n");
			console.log(fm.domain);
			console.log(fm.project);
			console.log("\n");

			if (fm.domain !== "domain/undefined") {
				name = fm.domain;
			} else if (fm.project !== undefined) {
				name = fm.project;
			} else {
				name = "\\-";
			}

			const record = {
				uuid:
					Helper.numberTypeToString(fm) === "fleeting"
						? `&#128196 ${Renderer.makeLinkAlias(dv, f)}`
						: Renderer.makeLinkAlias(dv, f),
				// uuid: `&#9728 ${Renderer.makeLinkAlias(dv, f)}`,
				type: Helper.numberTypeToString(fm),
				since: `${since}`,
				size: f.size,
				project: fm.project === undefined ? "\\-" : fm.project.slice(8),
				domain: fm.domain === undefined ? "\\-" : fm.domain.slice(7), //Renderer.domainBase(dv, fm.domain),
				name: name,
			};

			if (record.type === "log") {
				const pages = dv
					.pages(`"${Paths.Tasks}/${fm.parent_id}"`)
					.array();
				if (pages.length !== 1) {
					throw new Error(`${fm.parent_id} ${fm.id}`);
				}
				const parent = pages[0];
				switch (parent.type) {
					case Types.Task:
						record.uuid = `&#128211 ${record.uuid}`;
						record.type = `<font color=8B0000>task</font>`;
						break;
					case Types.Praxis:
						record.uuid = `&#128188 ${record.uuid}`;
						record.type = `<font color=FF8C00>praxis</font>`;
						break;
					case Types.Media:
						record.uuid = `&#128191 ${record.uuid}`;
						record.type = `<font color=00008B>media</font>`;
						break;
					case Types.Provision:
						record.type = `<font color=DC143C>provision</font>`;
						break;
					default:
						break;
				}
			}

			buff.push([
				record.uuid,
				// record.type,
				// record.since,
				// record.size,
				record.name,
				// record.project,
				// record.domain,
			]);
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

	basicRelation(dv, data) {
		const cols = ["uuid", "name"];
		const buff = [];
		for (const d of data) {
			const f = d.file;
			const fm = d.file.frontmatter;
			Assert.True(
				!Helper.nilCheck(fm.uuid),
				`"uuid" id not defined for: ${f.path}`,
			);
			buff.push([Renderer.makeLinkAlias(dv, f), fm.name]);
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

	basicTaskJournal(dv, data) {
		const buff = [];
		// const cols = ["journal", "uuid", "tasks", "estimate"];
		const cols = ["uuid", "tasks", "estimate"];
		// const journal = dv.pages(`"${Paths.Journal}"`).array()[0].file
		// 	.frontmatter.tasks;

		for (const d of data) {
			console.log(d);
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
					// journal.contains(fm.uuid) ? "->" : "\\-",
					dv.fileLink(f.path, false, fm.uuid.slice(0, 8)),
					dv.markdownTaskList(f.tasks),
					fm.time_estimate,
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
	activeTask(dv, data) {
		const buff = [];
		const cols = ["uuid", "tasks", "session"];
		for (const d of data) {
			const f = d.file;
			const fm = f.frontmatter;
			const logs = dv
				.pages(`"${Paths.Logs}/${fm.uuid}"`)
				.where((p) => p.type === 6)
				.sort((k) => k.created_at, "desc");
			const last = logs[0];
			const createdAt = new Date(last.created_at);
			const now = new Date();
			buff.push([
				dv.fileLink(f.path, false, fm.uuid.slice(0, 8)),
				dv.markdownTaskList(f.tasks),
				((t) => {
					return Math.round((t / (3600 * 1000)) * 10) / 10;
				})(now.getTime() - createdAt.getTime()),
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
			let start: any = 0;
			let stop: any = 0;
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
					`_totalTime (h):_ ${Math.round((totalTime / (1000 * 60 * 60)) * 10) / 10
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
				let start: any = 0;
				let stop: any = 0;
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

	taskDoneWithLogs(dv, data) {
		const buff = [];
		const cols = [
			"taskId",
			"logId",
			"createdAt",
			"doneAt",
			"timeEstimate",
			"took",
			"project",
		];
		for (const d of data) {
			const f = d.file;
			const fm = d.file.frontmatter;
			const createdAt: any = new Date(fm.created_at);
			const doneAt: any = new Date(fm.done_at);
			const timeEstimate = "";
			const took = (doneAt - createdAt) / (1000 * 3600);
			const pages = dv
				.pages(`"${Paths.Tasks}"`)
				.where((page) => page.file.frontmatter.uuid === fm.parent_id);
			if (pages.length !== 1) {
				throw new Error();
			}
			const parent = pages[0];
			const parentFm = parent.file.frontmatter;
			const parentF = parent.file;
			buff.push([
				Renderer.makeLinkShortUUID(dv, parent.file, "Task"),
				Renderer.makeLinkShortUUID(dv, f),
				createdAt.toISOString().slice(0, 10),
				doneAt.toISOString().slice(0, 10),
				timeEstimate,
				((t) => {
					return Math.round(t * 10) / 10;
				})(took),
				Helper.getProject(parentFm),
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
			// "createdAt",
			// "doneAt",
			"took",
			// "tookAcc",
			"project",
			// "domain",
		];
		dv.table(cols, data);
	},

	// dailyTask(dv, data) {
	// 	Renderer.makeLinkShortUUID(this.dv, page.file),
	// 	dv.
	// 				rs.push([
	// 					"paragraph",
	// 					Renderer.makeLinkShortUUID(this.dv, page.file),
	// 				]);
	// }

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
	dv: any;
	gonext: any;
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
			case Types.Permanent:
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

	nameInNamespace(fm: any, ns: string[]) {
		let found = false;
		if (ns.length === 0) {
			return true;
		}

		for (const a of ns) {
			const root = a.split("/");
			Assert.True(root.length === 2, `Invalid tag: '${a}'`);
			const parent =
				root[0].slice(0, 1) === "!" ? root[0].slice(1) : root[0];
			// console.log(parent)
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
		fm: any,
		byAreas: string[],
		byContexts: string[],
		byLayers: string[],
		byOrgs: string[],
		byProjects: string[],
	): boolean {
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

	filterByDate(dt: Date, before: Date, after: Date): boolean {
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
		let noteTypes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		if (!Helper.nilCheck(curFm.types) && curFm.types !== "*") {
			noteTypes = curFm.types;
		}
		// console.log(noteTypes);
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
				if (
					component.length > 10 &&
					component.slice(0, 10) === "component/"
				) {
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

		let minMatchingComponent = 0;
		if (components.length > 0) {
			if (Helper.nilCheck(curFm.min_matching_components)) {
				minMatchingComponent = components.length;
			} else {
				minMatchingComponent = curFm.min_matching_components;
			}
		}

		let noteTypes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
		if (!Helper.nilCheck(curFm.types) && curFm.types !== "*") {
			noteTypes = curFm.types;
		}
		const dropTasks = Helper.nilCheck(curFm.drop_status)
			? []
			: curFm.drop_status;
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
			org: [],
			domain: [],
			component: [],
			project: [],
		};

		const Types = {
			1: "literature",
			2: "permanent",
			3: "task",
			4: "praxis",
			5: "supply",
			6: "log",
			7: "resource",
			8: "media",
			9: "org",
			10: "domain",
			11: "component",
			12: "project",
			13: "fleeting",
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

			if (
				fm.type === 3 ||
				fm.type === 4 ||
				fm.type === 5 ||
				fm.type === 8
			) {
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

			if (fm.type === 7 || fm.type === 2) {
				if (!this.noteHelper.isLastRevision(page)) {
					continue;
				}
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

	goals() {
		const fm = this.frontmatter.getCurrentFrontmatter();
		const filterBy = new FilterBy(fm);
		const rs = [];
		const pages = this.dv.pages(`"${Paths.Goals}"`).where((page) => {
			const fmp = page.file.frontmatter;
			if (fmp.status !== "todo") {
				return false;
			}

			return true;
		});

		const buff = [];
		for (const page of pages) {
			const p = new FrontmatterJS(page);
			if (filterBy.filter(page.file.frontmatter)) {
				continue;
			}

			buff.push(p);
		}

		buff.sort((a, b) => {
			const dta = new Date(a.fm.before);
			const dtb = new Date(b.fm.before);
			return dta.getTime() - dtb.getTime();
		});
		rs.push(["header", 1, "Goals"]);
		rs.push(["array", Renderer.goal, buff]);

		return rs;
	}

	indexResources() {
		return this.indexCommon(Paths.Resources);
	}

	indexContent() {
		return this.indexCommon(Paths.Refs);
	}

	getProjectTasks(project: string) {
		return this.dv.pages(`"${Paths.Tasks}"`).where((page) => {
			const fm = page.file.frontmatter;
			if (page.type !== Types.Task && page.type !== Types.Media) {
				return false;
			}
			if (
				Helper.getProject(fm) !==
				`${Namespace.Project}/${project === "adhoc" ? "none" : project}`
			) {
				return false;
			}
			if (fm.status === Status.Done) {
				return false;
			}
			return true;
		});
	}

	projectTasksSheetRelationFrontmatter(dv) {
		const current = dv.current();
		// dconst fml = current.file.frontmatter;
		const fm = new FrontmatterJS(current);

		return {
			name: fm.getName(),
			uuid: fm.uuid,
		};
	}

	contextTasksSheet(dv) {
		// const project = this.projectTasksSheetRelationFrontmatter(dv);
		const minPriority = 0;

		const rs = [];
		// rs.push(["header", 2, project.name]);

		const bins = {
			doable: [],
			waiting: [],
			journal: [],
		};

		// const tasks = this.getProjectTasks(project.name);
		const pages = this.dv.pages(`"${Paths.Tasks}"`).where((page) => {
			const fm = page.file.frontmatter;
			if (page.type !== Types.Task && page.type !== Types.Media) {
				return false;
			}

			if (fm.status === Status.Done) {
				return false;
			}

			const fmjs = new FrontmatterJS(page);
			if (fmjs.getContext() !== `outside`) {
				return false;
			}

			return true;
		});

		for (const task of pages) {
			const fm = task.file.frontmatter;

			if (fm.priority !== undefined && fm.priority < minPriority) {
				continue;
			}

			if (this.noteHelper.isDoable(task)) {
				bins.doable.push(task);
			} else if (fm.status === Status.Todo) {
				bins.waiting.push(task);
			} else {
				continue;
			}
		}

		if (bins.doable.length > 0) {
			rs.push(["header", 2, `Next Actions (${bins.doable.length})`]);
			bins.doable.sort(
				(a, b) =>
					(a.file.frontmatter.priority -
						b.file.frontmatter.priority) *
					-1,
			);
			rs.push(["array", Renderer.basicTaskJournal, bins.doable]);
		}

		// console.log(bins.waiting);
		if (bins.waiting.length > 0) {
			rs.push(["header", 2, `Waiting (${bins.waiting.length})`]);
			const buff = [];
			for (const task of bins.waiting) {
				const fm = task.file.frontmatter;
				// if (fm.needs !== undefined && fm.needs.length > 0) {
				// 	fm.cause = fm.needs;
				// } else if (fm.after !== undefined) {
				// 	fm.cause = `after: ${fm.after}`;
				// } else {
				// 	fm.cause = "unknown";
				// }
				fm.cause = "unknown";
				buff.push(task);
			}

			rs.push(["array", Renderer.waitingTask, buff]);
		}

		return rs;
	}

	projectTasksSheetRelation(dv) {
		const project = this.projectTasksSheetRelationFrontmatter(dv);
		const minPriority = 0;

		const rs = [];
		// rs.push(["header", 2, project.name]);

		const bins = {
			nextAction: [],
			doable: [],
			waiting: [],
			journal: [],
			maybe: [],
		};

		const tasks = this.getProjectTasks(project.name);

		for (const task of tasks) {
			const fm = task.file.frontmatter;

			if (fm.priority !== undefined && fm.priority < minPriority) {
				continue;
			}

			if (this.noteHelper.isDoable(task)) {
				if (fm.priority == 9) {
					bins.nextAction.push(task);
				} else if (fm.priority > 0) {
					bins.doable.push(task);
				} else {
					bins.maybe.push(task);
				}
			} else if (fm.status === Status.Todo) {
				bins.waiting.push(task);
			} else if (fm.status === Status.Doing) {
			} else {
				throw new Error(`${fm.uuid}`);
			}
		}

		{
			let toReview = 0;
			const logs = this.getProjectLogs(dv, project);
			for (const log of logs) {
				if (log.file.frontmatter.reviewed < 1) {
					toReview += 1;
				}
			}

			// rs.push(["header", 2, `Pending Logs (${toReview})`]);
			// if (toReview > 0) {
			// 	rs.push([
			// 		"paragraph",
			// 		`[[${Paths.Projects}/${project.name === "adhoc" ? "ad hoc" : project.name
			// 		}/logs]]`,
			// 	]);
			// }
		}

		// return rs;
		// groupBy layer, ??
		if (bins.nextAction.length > 0) {
			rs.push(["header", 2, `Next Actions (${bins.doable.length})`]);
			bins.nextAction.sort(
				(a, b) =>
					(a.file.frontmatter.priority -
						b.file.frontmatter.priority) *
					-1,
			);
			rs.push(["array", Renderer.basicTaskJournal, bins.nextAction]);
		}

		if (bins.doable.length > 0) {
			rs.push(["header", 2, `Doable (${bins.doable.length})`]);
			bins.doable.sort(
				(a, b) =>
					(a.file.frontmatter.priority -
						b.file.frontmatter.priority) *
					-1,
			);
			rs.push(["array", Renderer.basicTaskJournal, bins.doable]);
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
					Helper.getProject(fm) !==
					`${Namespace.Project}/${project.name === "adhoc" ? "none" : project.name
					}`
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

	projectLogsSheetRelation(dv) {
		const project = this.projectTasksSheetRelationFrontmatter(dv);

		// const filterBy = this.frontmatter.parseListFilterBy(fml);
		const filterBy = [];
		const rs = [];

		rs.push(["header", 2, "Logs"]);

		const logs = this.dv.pages(`"${Paths.Logs}"`).where((page) => {
			if (page.type !== Types.Log) {
				return false;
			}
			if (page.file.frontmatter.reviewed > 0) {
				return false;
			}
			return true;
		});

		const buff = {};
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
			if (parent.length !== 1) {
				continue;
			}
			Assert.True(
				parent.length === 1,
				`Parent: ${fm.parent_id} not found for log: "${fm.uuid}"`,
			);
			fm.project = Helper.getProject(parent[0].file.frontmatter);
			fm.area = Helper.getArea(parent[0].file.frontmatter, true);
			if (
				fm.project !==
				`project/${project.name === "adhoc" ? "none" : project.name}`
			) {
				continue;
			}

			if (Helper.nilCheck(fm.done_at)) {
				continue;
			}
			const date = fm.done_at.slice(0, 10);

			if (buff[date] === undefined) {
				buff[date] = [e];
			} else {
				buff[date].push(e);
			}
		}

		const keys = Object.keys(buff);
		keys.sort();
		for (const date of keys) {
			buff[date].sort(
				(a, b) =>
					b.file.frontmatter.createdAt.getTime() -
					a.file.frontmatter.createdAt.getTime(),
			);
		}

		for (const date of keys.reverse()) {
			rs.push(["header", 3, date]);
			rs.push(["array", Renderer.projectLogs, buff[date]]);
		}

		return rs;
	}
	projectTasksSheet(dv) {
		const project = this.frontmatter.projectParseMeta(dv);
		const fml = this.frontmatter.getCurrentFrontmatter();
		if (fml === undefined) {
			throw new Error(`Invalid frontmatter, cannot proceed`);
		}

		const minPriority =
			fml.min_priority === undefined ? 0 : fml.min_priority;
		const journal = this.dv.pages(`"${Paths.Journal}"`).array()[0].file
			.frontmatter.tasks;

		const rs = [];
		rs.push(["header", 1, project.name]);

		const bins = {
			doable: [],
			waiting: [],
			journal: [],
			maybe: [],
			praxis: [],
		};

		const tasks = this.getProjectTasks(project.name);

		for (const task of tasks) {
			const fm = task.file.frontmatter;

			if (fm.priority !== undefined && fm.priority < minPriority) {
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

		{
			let toReview = 0;
			const logs = this.getProjectLogs(dv, project);
			for (const log of logs) {
				if (log.file.frontmatter.reviewed < 1) {
					toReview += 1;
				}
			}
			rs.push(["header", 2, `Pending Logs (${toReview})`]);
			if (toReview > 0) {
				rs.push([
					"paragraph",
					`[[${Paths.Projects}/${project.name === "adhoc" ? "ad hoc" : project.name
					}/logs]]`,
				]);
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
			rs.push(["array", Renderer.basicTaskJournal, bins.doable]);
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
					Helper.getProject(fm) !==
					`${Namespace.Project}/${project.name === "adhoc" ? "none" : project.name
					}`
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

	getProjectLogs(dv, project) {
		const logs = this.dv.pages(`"${Paths.Logs}"`).where((page) => {
			if (page.type !== Types.Log) {
				return false;
			}
			return true;
		});

		const buff = [];
		for (const e of logs) {
			const fm = e.file.frontmatter;
			Assert.True(
				!Helper.nilCheck(fm.parent_id),
				`Missing field "parent_id" from log: "${fm.uuid}"`,
			);
			const parent = this.dv
				.pages(`"${Paths.Tasks}/${fm.parent_id}"`)
				.array();
			if (parent.length !== 1) {
				continue;
			}
			// Assert.True(
			// 	parent.length === 1,
			// 	`Parent: ${fm.parent_id} not found for log: "${fm.uuid}"`,
			// );
			fm.project = Helper.getProject(parent[0].file.frontmatter);
			fm.area = Helper.getArea(parent[0].file.frontmatter, true);
			if (
				fm.project !==
				`project/${project.name === "adhoc" ? "none" : project.name}`
			) {
				continue;
			}

			if (Helper.nilCheck(fm.done_at)) {
				continue;
			}
			buff.push(e);
		}
		return buff;
	}

	projectLogsSheet(dv) {
		const project = this.frontmatter.projectParseMeta(dv);
		const fml = this.frontmatter.getCurrentFrontmatter();
		if (fml === undefined) {
			throw new Error(`Invalid frontmatter, cannot proceed`);
		}

		const before = Helper.nilCheck(fml.before)
			? new Date(0)
			: new Date(fml.before);
		const after = Helper.nilCheck(fml.after)
			? new Date()
			: new Date(fml.after);

		// console.log(`before: '${before}'`);
		// console.log(`after: '${after}'`);
		const filterBy = this.frontmatter.parseListFilterBy(fml);
		const rs = [];
		let totalTime = 0;
		rs.push(["header", 1, project.name]);

		const logs = this.dv.pages(`"${Paths.Logs}"`).where((page) => {
			if (page.type !== Types.Log) {
				return false;
			}
			return true;
		});

		const buff = {};
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
			if (parent.length !== 1) {
				continue;
			}
			// Assert.True(
			// 	parent.length === 1,
			// 	`Parent: ${fm.parent_id} not found for log: "${fm.uuid}"`,
			// );
			fm.project = Helper.getProject(parent[0].file.frontmatter);
			fm.area = Helper.getArea(parent[0].file.frontmatter, true);
			if (
				fm.project !==
				`project/${project.name === "adhoc" ? "none" : project.name}`
			) {
				continue;
			}

			if (Helper.nilCheck(fm.done_at)) {
				continue;
			}

			const date = fm.done_at.slice(0, 10);
			const createdAt = new Date(fm.created_at);
			const doneAt = new Date(fm.done_at);

			if (createdAt > before) {
				continue;
			}

			if (createdAt < after) {
				continue;
			}

			if (buff[date] === undefined) {
				buff[date] = [e];
			} else {
				buff[date].push(e);
			}

			const delta = doneAt.getTime() - createdAt.getTime();

			totalTime += delta;
		}

		dv.paragraph(
			`_totalTime (h):_ ${Math.round((totalTime / (1000 * 60 * 60)) * 10) / 10}`,
		);

		const keys = Object.keys(buff);
		keys.sort();
		for (const date of keys) {
			buff[date].sort(
				(a, b) =>
					b.file.frontmatter.createdAt.getTime() -
					a.file.frontmatter.createdAt.getTime(),
			);
		}

		for (const date of keys.reverse()) {
			rs.push(["header", 3, date]);
			rs.push(["array", Renderer.projectLogs, buff[date]]);
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

	logs() {
		const [groupBy, filterBy, before, after] =
			this.frontmatter.parseAllProgressedTasks();

		const tasks = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where((page) => page.file.frontmatter.status !== "doing");

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
					domain: Helper.getField(Helper.getDomain(fm, true), ""),
					path: task.file.path,
					logPath: log.file.path,
					createdAt: undefined,
					doneAt: undefined,
					took: undefined,
					tookAcc: undefined,
					deltaAcc: undefined,
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
			let d = undefined;

			try {
				d = keyGetter(entry);
			} catch {
				// console.log(entry);
				throw new Error(entry);
			}

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
					Renderer.makeLinkShortUUID(
						this.dv,
						{ path: e.path, frontmatter: { uuid: e.uuid } },
						"Task",
					),
				);

				// buff.push(
				// 	this.dv.sectionLink(
				// 		e.path,
				// 		"Task",
				// 		false,
				// 		`${e.uuid.slice(0, 8)}`,
				// 	),
				// );

				buff.push(
					Renderer.makeLinkShortUUID(
						this.dv,
						{ path: e.logPath, frontmatter: { uuid: e.logId } },
						"Content",
					),
				);
				// buff.push(
				// 	this.dv.sectionLink(
				// 		e.logPath,
				// 		"Content",
				// 		false,
				// 		`${e.logId.slice(0, 8)}`,
				// 	),
				// );

				// buff.push(`${e.createdAt.toISOString().slice(0, 16)}`);
				// buff.push(`${e.doneAt.toISOString().slice(0, 16)}`);

				const convertSecondsToHours = (t) => {
					return Math.round((t / 3600) * 10) / 10;
				};
				buff.push(`${convertSecondsToHours(e.took)}`);
				buff.push(`${e.project}`);

				arr.push(buff);
				totalTime += e.took;
			}

			// task
			totalTime = Math.round((totalTime / 3600) * 10) / 10;
			rs.push(["stats", "totalTime", "h", totalTime]);
			rs.push(["array", Renderer.basicProgressedTaskWithLog, arr]);
		}

		return rs;
	}

	inbox() {
		const rs = [];
		const buff = [];
		// fonction d'extraction et d'initialisation des paramrtres du frontmatter
		// fonction filter, (task) -> bool

		const filterBy = [];
		const minSize = 0;
		const maxSize = 4294967295;

		const fleetings = this.dv.pages(`"${Paths.Inbox}"`).array();
		for (const e of fleetings) {
			const fm = e.file.frontmatter;
			e.file.frontmatter.createdAt = this.frontmatter.getCreatedAt(
				e.file,
			);
			const fmjs = new FrontmatterJS(e);
			fm.project = Helper.getProject(fm, true);
			fm.domain = `domain/${fmjs.getDomain()}`;
			fm.components = Helper.getComponents(fm);

			if (e.file.size < minSize) {
				continue;
			}
			if (e.file.size > maxSize) {
				continue;
			}

			buff.push(e);
		}

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

			const pages = this.dv
				.pages(`"${Paths.Tasks}/${f.frontmatter.parent_id}"`)
				.array();
			if (pages.length !== 1) {
				return false;
			}

			// const parent = pages[0];
			// if (parent.type !== Types.Media) {
			// 	return false;
			// }

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
			fm.project = Helper.getProject(parent[0].file.frontmatter, true);
			fm.domain = undefined;
			fm.components = [];

			if (e.file.size < minSize) {
				continue;
			}
			if (e.file.size > maxSize) {
				continue;
			}

			buff.push(e);
		}

		const sortBySizeThenDate = function(a, b) {
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

		buff.sort(sortByAge);
		const filterFunc = (page) => {
			const fm = page.file.frontmatter;
			return true;

			if (Helper.getProject(fm, true) !== undefined) {
				return false;
			}

			if (Helper.getDomain(fm, true) !== undefined) {
				return false;
			}

			return true;
		};

		rs.push(["array", Renderer.inboxEntry, buff.filter(filterFunc)]);

		return rs;
	}

	projects() {
		let fml = this.frontmatter.getCurrentFrontmatter();
		if (fml === undefined) {
			fml = { inactive: [] };
		}

		const rs = [];
		const bins = {
			active: [],
			inactive: [],
		};

		const pages = this.dv.pages(`"Projects"`).sort((k) => k.name, "asc");
		for (const project of pages) {
			const fmProject = new FrontmatterJS(project);
			if (fmProject.getName() === "adhoc") {
				bins.active.push(project);
				continue;
			}

			const tasks = this.dv
				.pages(`#project/${fmProject.getName()}`)
				.where((page) => {
					if (page.file.folder !== `${Paths.Tasks}`) {
						return false;
					}

					const fmTask = new FrontmatterJS(page);
					if (fmTask.getProject() !== fmProject.getName()) {
						return false;
					}

					if (
						fmTask.fm.status === "todo" ||
						fmTask.fm.status === "doing"
					) {
						return true;
					}

					return false;
				});

			let nextActionCount = 0;
			for (const task of tasks) {
				// console.log(task.file.frontmatter.priority);
				if (task.file.frontmatter.priority === 9) {
					nextActionCount++;
				}
			}

			if (
				tasks.length === 0 ||
				nextActionCount === 0 ||
				fml.inactive.contains(fmProject.getName())
			) {
				bins.inactive.push(project);
			} else {
				bins.active.push(project);
			}
		}

		// rs.push(["header", 1, "Projects"]);
		rs.push(["array", Renderer.basicRelation, bins.active]);
		rs.push(["header", 2, "Inactive"]);
		rs.push(["array", Renderer.basicRelation, bins.inactive]);

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

		const rs = [];
		rs.push(["header", 1, "Praxis"]);
		rs.push(["array", Renderer.basicTask, pages]);

		return rs;
	}

	planning(lastWeek = 2) {
		const rs = [];
		const pages = this.dv
			.pages(`"${Paths.Tasks}"`)
			.where((page) => {
				const fm = new FrontmatterJS(page);
				if (fm.at === undefined) {
					return false;
				}

				if (fm.getProject() !== "daily") {
					return false;
				}

				return true;
			})
			.sort((page) => page.file.frontmatter.at, "desc");

		const bins = {};
		for (const page of pages) {
			const fm = new FrontmatterJS(page);
			let at = undefined;
			try {
				at = fm.at.toISOString().slice(0, 10);
			} catch {
				throw new Error(`Invalid date: '${fm.fm.uuid}'`);
			}

			const weekNumber = this.getWeekNumber(fm.at);
			if (bins[weekNumber] === undefined) {
				bins[weekNumber] = [fm];
			} else {
				bins[weekNumber].push(fm);
			}
		}

		const now = new Date();
		const currentWeekNumber = this.getWeekNumber(now);
		for (const key of Object.keys(bins)) {
			const weekNumber = Number(key);
			if (weekNumber+lastWeek < currentWeekNumber) {
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
					"daily",
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
}

export class DvLib {
	taskDir = "813 Tasks";
	inboxDir = "800 Inbox";
	refDir = "802 Refs";
	logDir = "600 Log";

	Task = {
		BASE: 3,
		DAILY: 4,
	};

	Type = {
		TASK: 3,
		DAILY: 4,
		LOG: 6,
	};

	Status = {
		TODO: "todo",
		DONE: "done",
		DOING: "doing",
		TRASH: "trash",
		MAYBE: "maybe",
		STANDBY: "standby",
	};

	Namespace = {
		AREA: "area",
		CONTEXT: "context",
		LAYER: "layer",
		ORG: "org",
		PROJECT: "project",
	};

	Default = {
		AREA: "none",
		CONTEXT: "any",
		LAYER: "none",
		ORG: "none",
		PROJECT: "none",
	};

	_dv = "";

	set dv(mod) {
		this._dv = mod;
	}

	get dv() {
		return this._dv;
	}

	isChildTag(parent, child) {
		if (child.length <= parent.length + 1) {
			return false;
		} else if (child.slice(0, parent.length + 1) != `${parent}/`) {
			return false;
		}
		return true;
	}

	stripTag(tag) {
		let t = "";
		if (tag.slice(-1) === "/") {
			t = tag.slice(0, -1);
		} else {
			t = tag;
		}
		if (t.slice(0, 1) === "#") {
			t = t.slice(1, t.length);
		}
		return t;
	}

	getTaskFromUUID(dv, uuid) {
		const n = dv.pages(`"${this.taskDir}/${uuid}"`);
		if (n.length === 0) {
			// should warn, this means note depends on a non-existing task
			console.warn(`"${this.taskDir}/${uuid}" task does not exists`);
			return undefined;
		}
		return n[0];
	}

	hasValidFormat(task) {
		// dv.pages returns an array wether it finds 1 or more notes
		const fm = task.file.frontmatter;
		if (fm === undefined) {
			// this should warn, all tasks should have a frontmatter
			console.warn(
				`"${this.taskDir}/${task.uuid}" task does not have a frontmatter`,
			);
			return false;
		}

		if (fm.type === undefined) {
			// all tasks must have a `type` field
			console.warn(
				`"${this.taskDir}/${task.uuid}" task does not have a \`type\` field`,
			);
			return false;
		}

		if (fm.status === undefined) {
			// all tasks must have a `status` field
			console.warn(
				`"${this.taskDir}/${task.uuid}" task does not have a \`status\` field`,
			);
			return false;
		}
		return true;
	}

	hasPendingDependencies(dv, deps) {
		for (const dep of deps) {
			const task = this.getTaskFromUUID(dv, dep);
			if (task === undefined) {
				continue;
			}
			if (!this.hasValidFormat(task)) {
				continue;
			}
			const fm = task.file.frontmatter;
			if (
				fm.type !== this.Task.BASE &&
				fm.type !== this.Task.DAILY
			) {
				continue;
			}
			if (fm.status === this.Status.TODO) {
				return true;
			}
		}
		return false;
	}

	isDoable(dv, task) {
		const fm = task.file.frontmatter;

		if (fm.status !== this.Status.TODO) {
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

		if (this.hasPendingDependencies(dv, deps)) {
			return false;
		}

		return true;
	}

	getNamespaceContent(dv, ns) {
		const children = [];
		const resp = dv.pages(`#${ns}`);
		for (const f of resp) {
			const tags = f.tags;
			if (tags === undefined) {
				continue;
			}

			for (const tag of tags) {
				if (this.isChildTag(ns, tag)) {
					const t = tag.slice(ns.length + 1);
					if (!children.includes(t)) {
						children.push(t);
					}
				}
			}
		}

		return children;
	}

	isDone(dv, dep) {
		const task = this.getTaskFromUUID(dv, dep);
		if (task === undefined) {
			return false;
		}

		if (!this.hasValidFormat(task)) {
			return false;
		}

		const fm = task.file.frontmatter;
		if (fm.status === this.Status.DONE) {
			return true;
		}

		return false;
	}

	getTasks(
		dv,
		tag,
		taskType = [this.Task.BASE, this.Task.DAILY],
		status = this.Status.TODO,
	) {
		const buff = [];
		const tasks = dv.pages(tag);

		for (const task of tasks) {
			const fm = task.file.frontmatter;
			if (fm === undefined) {
				continue;
			}
			if (fm.status === undefined || fm.status !== status) {
				continue;
			}
			if (fm.type === undefined || !taskType.contains(fm.type)) {
				continue;
			}
			buff.push(task);
		}

		return buff;
	}

	formatTask(dv, task) {
		return dv.fileLink(task.file.path);
	}

	formatTaskBis(dv, task) {
		const f = task.file;
		let ctx = "";

		for (const tag of f.tags) {
			if (tag.slice(0, 9) == "#context/") {
				ctx = tag.slice(9);
			}
		}

		return [
			dv.fileLink(f.path),
			dv.markdownTaskList(f.tasks),
			f.frontmatter.time_estimate,
			ctx,
		];
	}

	formatTaskBase(dv, task) {
		const f = task.file;
		const fm = f.frontmatter;
		const tags = fm.tags;

		const area = this.getArea(tags);

		return [
			dv.fileLink(f.path, false, fm.uuid.slice(0, 8)),
			dv.markdownTaskList(f.tasks),
			fm.time_estimate,
			area,
		];
	}

	formatTaskWaiting(dv, task) {
		const f = task.file;
		const fm = f.frontmatter;
		const deps = [];

		if (fm.needs !== undefined) {
			for (const dep of fm.needs) {
				deps.push(dv.fileLink(`${this.taskDir}/${dep}`));
			}
		}
	}

	formatTaskMaybe(dv, task) {
		const f = task.file;
		const fm = f.frontmatter;
		const deps = [];

		return [dv.fileLink(f.path)];
	}

	makeAsyncRequest(dv, uuid) {
		return dv
			.query(`LIST WHERE needs AND contains(needs, "${uuid}")`)
			.then((value) => {
				return value;
			});
	}

	getDependantTasks(dv, task) {
		const buff = [];
		const uuid = task.file.name;

		if (task.file.frontmatter === undefined) {
			return buff;
		}

		const tasks = dv
			.pages(`"${this.taskDir}"`)
			.where((p) => p.needs !== undefined && p.needs.contains(uuid));
		for (const tk of tasks) {
			const t = dv.pages(`"${tk.file.path}"`);
			buff.push(t[0]);
		}

		return buff;
	}

	byDependencyAndPriorityAndCreatedAt(dv, a, b) {
		const ftA = a.file.frontmatter;
		const ftB = b.file.frontmatter;
		const prioA = ftA.priority;
		const prioB = ftB.priority;
		// before > deps > prio > created_at
		// let beforeA = ftA.before;
		// let beforeB = ftB.before;

		const depsA = this.getDependantTasks(dv, a);
		const depsB = this.getDependantTasks(dv, b);

		if (depsA.length - depsB.length !== 0) {
			return depsA.length - depsB.length;
		}

		if (prioA - prioB !== 0) {
			return prioA - prioB;
		}

		const dateA = new Date(ftA.created_at);
		const dateB = new Date(ftB.created_at);

		return (dateA.getTime() - dateB.getTime()) * -1;
	}

	formatTaskPlanningWaiting(dv, task) {
		const f = task.file;

		return [
			// ajouter alias sur le link
			dv.markdownTaskList(f.tasks),
			dv.fileLink(f.path, false, f.name.slice(0, 8)),
			f.frontmatter.time_estimate,
			f.frontmatter.cause,
		];
	}

	renderBaseAsArray(dv, tasks) {
		const arr = [];
		tasks.forEach((task) => {
			arr.push(this.formatTaskBase(dv, task));
		});
		dv.table(["uuid", "tasks", "estimate", "area"], arr);
	}

	renderPlanningWaiting(dv, tasks) {
		const arr = [];
		tasks.forEach((task) => {
			arr.push(this.formatTaskPlanningWaiting(dv, task));
		});
		dv.table(["tasks", "uuid", "estimate", "cause"], arr);
	}

	renderMaybeAsArray(dv, tasks) {
		const arr = [];
		tasks.forEach(({ ref, task }) => {
			if (task !== undefined) {
				arr.push(this.formatTaskMaybe(dv, task));
			}
		});
		dv.table(["uuid"], arr);
	}

	formatTaskDaily(dv, task) {
		const f = task.file;
		const fm = task.file.frontmatter;
		const tags = task.file.tags;
		const areas = [];

		for (const tag of tags) {
			if (tag.slice(0, 6) == "#area/") {
				areas.push(tag.slice(6));
			}
		}

		const links = [];
		for (const link of f.outlinks) {
			links.push(link);
		}

		const tasks = [];
		for (const t of f.tasks) {
			tasks.push(t);
		}

		return [
			dv.fileLink(f.path),
			links.length > 0
				? dv.markdownList(links)
				: dv.markdownTaskList(tasks),
			fm.time_allocated,
			areas.length > 0 ? dv.markdownList(areas) : "",
		];
	}

	formatFleeting(dv, task) {
		const f = task.file;
		const fm = task.file.frontmatter;
		const tags = task.file.tags;
		const hours = 3600;
		const days = 86400;

		let dt = new Date();
		if (fm !== undefined && fm.created_at !== undefined) {
			dt = new Date(fm.created_at);
		} else {
			dt = new Date(f.ctime.ts);
		}
		const now = new Date();
		const delta = (now.getTime() - dt.getTime()) / 1000;
		let since = "";
		const toDt = (t) => {
			return String(Math.round(t * 10) / 10).padStart(2, "0");
		};
		if (delta >= days) {
			// days ago
			since = toDt(delta / days) + "d";
		} else {
			// hours ago
			since = toDt(delta / hours) + "h";
		}

		// return [dv.fileLink(`${f.path}#Content`), since, f.size];
		if (fm.alias === undefined || fm.alias === "") {
			return [dv.fileLink(`${f.path}`), since, f.size];
		} else {
			return [dv.fileLink(`${f.path}`, false, fm.alias), since, f.size];
		}
	}

	renderDailyAsArray(dv, tasks) {
		const arr = [];
		tasks.forEach((task) => {
			arr.push(this.formatTaskDaily(dv, task));
		});
		dv.table(["uuid", "content", "duration", "area"], arr);
	}

	renderFleetingAsArray(dv, tasks) {
		const arr = [];
		tasks.forEach((task) => {
			arr.push(this.formatFleeting(dv, task));
		});
		dv.table(["content", "age", "size"], arr);
	}

	autoFieldNeed(dv, fm) {
		if (fm.needs === undefined) {
			return;
		}
		const buff = [];
		for (const dep of fm.needs) {
			if (!this.isDone(dv, dep)) {
				buff.push(dv.fileLink(`${this.taskDir}/${dep}`));
			}
		}
		if (buff.length > 0) {
			dv.header(2, "Needs");
			dv.list(buff);
		}
	}

	autoFieldNeededBy(dv, current) {
		const tasks = this.getDependantTasks(dv, current);
		if (tasks.length === 0) {
			return;
		}

		const buff = [];
		for (const task of tasks) {
			if (!this.isDone(dv, task.uuid)) {
				buff.push(dv.fileLink(task.file.path));
			}
		}
		if (buff.length > 0) {
			dv.header(2, "NeededBy");
			dv.list(buff);
		}
	}

	autoFieldTags(dv, fm) {
		const tags = fm.tags;
		if (tags == undefined || tags.length === 0) {
			return;
		}

		tags.sort();
		dv.header(2, "Tags");
		let s = "";
		for (const tag of tags) {
			s += ` #${tag}`;
		}
		dv.paragraph(s);

		// dv.paragraph(s);
		// for (const tag of tags) {
		//   dv.paragraph(`#${tag}`);
		// }
	}

	autoFieldTaskBase(dv) {
		const current = dv.current();
		const fm = current.file.frontmatter;
		if (fm === undefined) {
			console.warn("fm is required");
			return;
		}

		this.autoFieldNeed(dv, fm);
		this.autoFieldNeededBy(dv, current);
		this.autoFieldTags(dv, fm);

		const logEntries = dv
			.pages(`"${this.logDir}/${fm.uuid}"`)
			.where((p) => p.type === 6)
			.sort((k) => k.created_at, "desc");

		const buff = [];
		let totalTime = 0;
		for (const entry of logEntries) {
			const fme = entry.file.frontmatter;
			const e = [];
			let start: any = 0;
			let stop: any = 0;

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
					`_totalTime (h):_ ${Math.round((totalTime / (1000 * 60 * 60)) * 10) / 10
					}`,
				);
			}
		}
	}

	autoFieldLog(dv) {
		const current = dv.current();
		const fm = current.file.frontmatter;
		if (fm === undefined) {
			return;
		}

		dv.header(2, "Parent");
		dv.paragraph(dv.fileLink(`${this.taskDir}/${fm.parent_id}`));
	}

	autoFieldAuthors(dv, fm) {
		const authors = fm.authors;
		if (authors === undefined || authors.length === 0) {
			return;
		}
		dv.header(2, "Authors");
		dv.list(authors);
	}

	autoFieldTitle(dv, fm) {
		const title = fm.alias;
		if (title == undefined) {
			return;
		}

		dv.header(1, title);
	}

	autoFieldLiteratureNote(dv) {
		const current = dv.current();
		const fm = current.file.frontmatter;
		if (fm === undefined) {
			return;
		}

		this.autoFieldTitle(dv, fm);
		this.autoFieldAuthors(dv, fm);
		this.autoFieldTags(dv, fm);
	}

	autoFieldPermanent(dv) {
		const current = dv.current();
		const fm = current.file.frontmatter;
		if (fm === undefined) {
			return;
		}

		this.autoFieldTags(dv, fm);
	}

	autoFieldTask(dv) {
		return this.autoFieldTaskBase(dv);
	}

	autoFieldLiterature(dv) {
		return this.autoFieldLiteratureNote(dv);
	}

	autoFieldFleeting(dv) {
		return;
	}

	autoFieldSupply(dv) {
		return;
	}

	findTasksByProject(dv, name) {
		const buff = [];

		if (name !== "" && name !== "none") {
			const tasks = this.getTasks(dv, `${this.Namespace.PROJECT}/none`, [
				this.Task.BASE,
			]);
			for (const task of tasks) {
				const fm = task.file.frontmatter;
				if (this.isDoable(dv, task)) {
					buff.push(task);
				}
			}
		} else {
			const tasks = this.getTasks(dv, "", [this.Task.BASE]);
			for (const task of tasks) {
				const fm = task.file.frontmatter;
				const tags = fm.tags;
				if (
					(fm.tags === undefined &&
						(name === "" || name === "none")) ||
					fm.tags.contains(`${this.Namespace.PROJECT}/none`)
				) {
					if (this.isDoable(dv, task)) {
						buff.push(task);
					}
				}
			}
		}

		buff.sort();
		return buff;
	}

	getTag(tags, type) {
		let name = "";
		let defaultValue = "";

		if (type === "area") {
			name = this.Namespace.AREA;
			defaultValue = this.Default.AREA;
		} else if (type === "context") {
			name = this.Namespace.CONTEXT;
			defaultValue = this.Default.CONTEXT;
		} else if (type === "layer") {
			name = this.Namespace.LAYER;
			defaultValue = this.Default.LAYER;
		} else if (type === "org") {
			name = this.Namespace.ORG;
			defaultValue = this.Default.ORG;
		} else if (type === "project") {
			name = this.Namespace.PROJECT;
			defaultValue = this.Default.PROJECT;
		} else {
			throw new Error(`getTag got unsuported type: ${type}`);
		}

		const len = name.length + 1;
		const defaultTag = `${name}/${defaultValue}`;
		if (tags === undefined) {
			return defaultTag;
		}

		for (const tag of tags) {
			if (tag.length > len && tag.slice(0, len) == `${name}/`) {
				return tag;
			}
		}

		return defaultTag;
	}

	getArea(tags) {
		return this.getTag(tags, "area");
	}

	getContext(tags) {
		return this.getTag(tags, "context");
	}
	getLayer(tags) {
		return this.getTag(tags, "layer");
	}

	getOrg(tags) {
		return this.getTag(tags, "org");
	}

	getProject(tags) {
		return this.getTag(tags, "project");
	}

	parseListFrontmatter(fm) {
		let minPriority = 0;
		if (fm.min_priority !== undefined) {
			minPriority = fm.min_priority;
		}

		let ignore = [];
		if (fm.ignore !== undefined) {
			ignore = fm.ignore;
		}

		let byAreas = [];
		if (fm.by_areas !== undefined) {
			byAreas = fm.by_areas;
		}

		let byProjects = [];
		if (fm.by_projects !== undefined) {
			byProjects = fm.by_projects;
		}
		return [minPriority, ignore, byAreas, byProjects];
	}

	renderNamespaceContent(dv) {
		const self = dv.current();
		const name = self.file.name.toLowerCase().slice(0, -1);

		dv.header(1, "Index");
		dv.header(2, `${self.file.name}`);

		const tags = this.getNamespaceContent(dv, name);
		tags.sort();

		for (const tag of tags) {
			dv.paragraph(`#${name}/${tag}`);
		}
	}

	renderUnprocessedLogs(dv) {
		const logs = dv
			.pages(`"${this.logDir}"`)
			.where(
				(p) =>
					p.type === this.Type.LOG &&
					(p.reviewd === undefined || p.reviewed < 1),
			)
			.sort((k) => k.created_at, "asc");

		const buff = [];

		for (const entry of logs) {
			// console.log(entry.file);
			// const fm = task.file.frontmatter;
			// if (ignore.contains(fm.uuid)) {
			// 	continue;
			// }
			// if (today.contains(fm.uuid)) {
			// 	continue;
			// }
			// if (fm.priority !== undefined && fm.priority < minPriority) {
			// 	continue;
			// }
			// if (lib.isDoable(dv, task)) {
			// 	buff.push(task);
			// }
		}

		// if (tasks.length > 0) {
		// 	dv.header(2, "AdHoc");
		// 	lib.renderBaseAsArray(dv, buff.reverse());
		// }

		const arr = [];
		logs.forEach((entry) => {
			const fm = entry.file.frontmatter;
			if (fm === undefined) {
				return;
			}

			const parentId = fm.parent_id;
			if (parentId === undefined) {
				throw new Error(`Invalid log entry: ${entry.file.path}`);
			}

			const parent = dv.pages(`"${this.taskDir}/${parentId}"`);
			const parentFm = parent.file.frontmatter;
			if (parentFm === undefined) {
				throw new Error(`Invalid task: ${parent.file.path}`);
			}

			let project = this.getProject(parentFm.tags);
			if (
				project === `${this.Namespace.PROJECT}/${this.Default.PROJECT}`
			) {
				project = "";
			}

			let area = this.getArea(parentFm.tags);
			if (area === `${this.Namespace.AREA}/${this.Default.AREA}`) {
				area = "";
			}

			const formated = [];

			formated.push(
				dv.sectionLink(
					entry.file.path,
					"Content",
					false,
					`${fm.uuid.slice(0, 8)}`,
				),
			);
			const createdAt = new Date(fm.created_at);
			formated.push(createdAt.toISOString().slice(0, 10));
			formated.push(project);
			formated.push(area);
			arr.push(formated);
		});

		dv.table(["uuid", "created_at", "project", "area"], arr);
	}

	assertTaskDoneAt(dv, taskId) {
		const task = dv.pages(`"${this.taskDir}/${taskId}"`);
		if (task.length === 0) {
			throw new Error(`task: ${taskId} doest not exists`);
		}

		const fm = task.file.frontmatter;
		if (fm === undefined) {
			throw new Error(`task: ${taskId} does not have a frontmatter`);
		}

		const logs = dv
			.pages(`"${this.logDir}/${taskId}"`)
			.sort((k) => k.created_at, "asc");
		if (logs.length < 1) {
			throw new Error(`task: ${taskId} has no Logs`);
		}

		const lastEntry = logs[logs.length - 1];
		if (lastEntry.file.frontmatter.done_at === undefined) {
			throw new Error(
				`task: ${taskId} last entry is missing 'done_at' field`,
			);
		}

		const doneAt = new Date(lastEntry.file.frontmatter.done_at);
		return [
			dv.sectionLink(
				task.file.path,
				"Content",
				false,
				`${task.file.frontmatter.uuid.slice(0, 8)}`,
			),
			`${doneAt.toISOString().slice(0, 10)}`,
		];
	}

	getDoneTimeline(dv) {
		// prends en compte doing -> done, pas les task sur lequelles du travail a été fait mais qui ont été suspend
		// daily, task trop longue pour etre faite en un sitting
		const tasks = dv
			.pages(`"${this.taskDir}"`)
			.where((p) => p.status === "done");

		const buff = [];
		for (const task of tasks) {
			const fm = task.file.frontmatter;
			if (fm === undefined) {
				throw new Error(`task: ${fm.uuid} does not have a frontmatter`);
			}

			const logs = dv
				.pages(`"${this.logDir}/${fm.uuid}"`)
				.sort((k) => k.created_at, "asc");
			if (logs.length < 1) {
				console.warn(`task: ${fm.uuid} has no Logs`);
				// throw new Error(`task: ${taskId} has no Logs`);
			}

			const lastEntry = logs[logs.length - 1];
			if (lastEntry === undefined) {
				continue;
			}
			if (lastEntry.file.frontmatter.done_at === undefined) {
				throw new Error(
					`task: ${fm.uuid} last entry is missing 'done_at' field`,
				);
			}

			fm.doneAt = new Date(lastEntry.file.frontmatter.done_at);
			buff.push(task);
		}

		buff.sort((a, b) => {
			const dateA = new Date(a.file.frontmatter.doneAt);
			const dateB = new Date(b.file.frontmatter.doneAt);
			return (dateA.getTime() - dateB.getTime()) * -1;
		});

		const arr = [];
		buff.forEach((e) => {
			arr.push([
				dv.sectionLink(
					e.file.path,
					"Content",
					false,
					`${e.file.frontmatter.uuid.slice(0, 8)}`,
				),
				`${e.file.frontmatter.doneAt.toISOString().slice(0, 16)}`,
			]);
		});

		dv.table(["uuid", "doneAt"], arr);
	}

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
			console.warn(`Unhandled case mult: ${mult}`);
		}

		return m * parseInt(val.slice(0, -1));
	}

	testDvFunc() {
		// prends en compte doing -> done, pas les task sur lequelles du travail a été fait mais qui ont été suspend
		// daily, task trop longue pour etre faite en un sitting
		// @ts-ignore
		const dv = app.plugins.plugins.dataview.api;
		const tasks = dv
			.pages(`"${this.taskDir}"`)
			.where((p) => p.status === "done");

		const buff = [];
		for (const task of tasks) {
			const fm = task.file.frontmatter;
			if (fm === undefined) {
				throw new Error(`task: ${fm.uuid} does not have a frontmatter`);
			}

			const logs = dv
				.pages(`"${this.logDir}/${fm.uuid}"`)
				.sort((k) => k.created_at, "asc");
			if (logs.length < 1) {
				console.warn(`task: ${fm.uuid} has no Logs`);
				// throw new Error(`task: ${taskId} has no Logs`);
			}

			const lastEntry = logs[logs.length - 1];
			if (lastEntry === undefined) {
				continue;
			}
			if (lastEntry.file.frontmatter.done_at === undefined) {
				throw new Error(
					`task: ${fm.uuid} last entry is missing 'done_at' field`,
				);
			}

			fm.doneAt = new Date(lastEntry.file.frontmatter.done_at);
			buff.push(task);
		}

		buff.sort((a, b) => {
			const dateA = new Date(a.file.frontmatter.doneAt);
			const dateB = new Date(b.file.frontmatter.doneAt);
			return (dateA.getTime() - dateB.getTime()) * -1;
		});

		const arr = [];
		buff.forEach((e) => {
			arr.push([
				dv.sectionLink(
					e.file.path,
					"Content",
					false,
					`${e.file.frontmatter.uuid.slice(0, 8)}`,
				),
				`${e.file.frontmatter.doneAt.toISOString().slice(0, 16)}`,
			]);
		});

		// dv.table(["uuid", "doneAt"], arr);
	}
}
