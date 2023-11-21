import { Plugin, Workspace, HTMLElement, MarkdownView } from "obsidian";
import { Helper, Frontmatter, ListMaker, Namespace, Renderer } from "./api";
import { Paths, Status, Types, Namespace, Default } from "./constants";

// Remember to rename these classes and interfaces!
interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

// représente la vue actuelle, l'onglet actif, le focus
// contient une ref au frontmatter qui est preprocess, 
// ie champs fm.project, fm.area, ... sont populés
class Current {
	constructor() {
	}
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	workspace: Workspace;
	metadataCache: Any;
	dv: Any;
	render: Render;
	debug: bool;
	taskInStatusBar: HTMLElement;
	api: Any;
	listMake: ListMaker;
	frontmatter: Frontmatter;

	printCoucou() {
		console.log("Couou, tu veux voir ma bite?");
	}

	// reviewLog() {
	// 	const fm = this.getCurrentFrontmatter();
	// 	if (fm === undefined) {
	// 		return;
	// 	}
	//
	// 	if (fm.type === undefined) {
	// 		// console.warn(`file: ${fm} does not have a valid schema`);
	// 		return;
	// 	}
	//
	// 	if (fm.type !== 6) {
	// 		// console.warn(`file: ${fm} is not of "log" type`);
	// 		return;
	// 	}
	//
	// 	const currentReviewed = fm.reviewed;
	// 	// obsidian plugin API, write file on disk, frontmatter changed
	// }

	async onload() {
		console.log("gonext - onload()");
		await this.loadSettings();
		this.metadataCache = app.metadataCache;
		this.workspace = app.workspace;
		this.dv = app.plugins.plugins.dataview.api;
		this.frontmatter = new Frontmatter(this);
		this.listMaker = new ListMaker(this, this.dv, this.frontmatter);

		this.api = {
			getArea: Helper.getArea,
			getContext: Helper.getContext,
			getLayer: Helper.getLayer,
			getOrg: Helper.getOrg,
			getProject: Helper.getProject,
			durationStringToSec: Helper.durationStringToSec,
			paths: Paths,
			types: Types,
			namespace: Namespace,
			default: Default,
			frontmatter: this.frontmatter,
			listMaker: this.listMaker,
			renderer: Renderer,
		};

		window.gonext = {
			state: window.gonext?.state ?? {},
			app: this.app,
		};

		this.taskInStatusBar = this.addStatusBarItem();
		this.taskInStatusBar.setText("");

		// console.log(window.app);
		// this.statusBar = this.app.createDiv();
		// this.statusBar.innerHTML = "";
		// this.app.dom.statusBarEl.appendChild(el);

		this.app.workspace.on("active-leaf-change", () => {
			// const activeTasks = this.dv
			// 	.pages(`"813 Tasks"`)
			// 	.where((fm) => fm.status === "doing");
			// this.taskInStatusBar.setText(`${activeTasks.length} active`);

			const leaf = app.workspace.activeLeaf;
			const tabTitleOrig = leaf.tabHeaderInnerTitleEl.innerText;
			if (tabTitleOrig.length !== 36) {
				// console.warn("'tabTitleOrig.length' !== 36");
				return;
			}

			const fm = this.frontmatter.getCurrentFrontmatter();
			if (fm === undefined) {
				return undefined;
			}

			const alias = fm.alias;
			if (Helper.nilCheck(alias) || alias === "") {
				return;
			}

			leaf.tabHeaderInnerTitleEl.innerText = alias;
			leaf.tabHeaderInnerTitleEl.innerHTML = alias;

			// app.workspace.activeLeaf.containerEl.children -> html, good luck pour retrouver la bonne div
			// this.statusBarEl.setText("coucou");
			// this.addStatusBarItem().createEl("span", { text: "Hello from the status bar 👋" });
		});

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "gonext-utils-copy-current-file-uuid",
			name: "Copy current file UUID",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const fm = this.gonext.getCurrentFrontmatter();
				if (fm === undefined) {
					// console.warn(
					// 	"Current file does not have a valid `frontmatter`",
					// );
					return;
				}

				if (fm.uuid == undefined) {
					// console.warn("Current file does not have a valid `UUID`");
					return;
				}

				// console.log("editor callback function");
				// console.log(editor.getSelection());
				// editor.replaceSelection('Sample Editor Command');
			},
		});
	}

	onunload() {
		console.log("gonext - onunload()");
		delete window.gonext;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
