/*
-------
This plugin is inspired from the Recent Files plugin made by tgrosinger : https://github.com/tgrosinger/recent-files-obsidian.
Some parts of this code has been made by him/her.
-------
*/

import { App, Notice, Plugin, Setting} from 'obsidian';
import {RefFillerSettingTab} from './settings'
import { RefModal } from 'modal';
// import {openAndFillTemplate} from 'template'

const axios = require('axios');
const handlebars = require('handlebars');

interface RefFillerSettings {
	templatePath: string;
}

const DEFAULT_SETTINGS: Partial<RefFillerSettings> = {
	templatePath: '/templatePathPlaceholder' ///General/Templates/Template fiche de lecture
}

export default class RefFillerPlugin extends Plugin {
	settings: RefFillerSettings;
	template: any;

	async onload() {
		await this.loadSettings();
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new RefFillerSettingTab(this.app, this));

		this.loadTemplate();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon("book", "Query reference by DOI", () => {
			console.log('add ribon icopn')
			new RefModal(this.app, (doi) => {
				axios.get('https://api.crossref.org/works/' + doi).then((res : object , err : object) => {
					if (!res){
						new Notice("Cannot find a document with this DOI")
						throw err;
					} 
					let data = res.data.message;

					try{
						this.openAndFillTemplate({data});
					}
					catch {
						new Notice("An issue occured while parsing data. See console for more details.")
					}
				})
			}).open();
		});
	}

	private async loadTemplate(){
		const templatePath = this.settings.templatePath;
		const templateFile : TFile = this.app.vault
			.getFiles()
			.find((f) => f.path === templatePath );
		console.log('template file : ' + templateFile + ' template path :' + templatePath)
		const templateText = await this.app.vault.read(templateFile);
		this.template = handlebars.compile(templateText);

		console.log('template text : ' + templateText)

		handlebars.registerHelper("list", function(context, options) {
			return context.reduce((acc, cur) => acc + options.fn(cur), '');
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private readonly openAndFillTemplate = async ({shouldSplit = false, data = {}}) => {
		if (this.template) {
			console.log("data : ", data)
			data.publicationYear = data.published ? data.published['date-parts'][0][0] :
									data.created ? data.created['date-parts'][0][0] + ' (creation time)' :
									'undefined';
			data.authors = data.author.map(auth => '@' + auth.given + auth.family).join(', ');

			let leaf = this.app.workspace.getMostRecentLeaf();
			const createLeaf = shouldSplit || leaf.getViewState().pinned;
			if (createLeaf) {
				leaf = this.app.workspace.createLeafBySplit(leaf);
			}

			let title : string = Array.isArray(data.title) ? data.title[0] : data.title;
			let subtitle : string = Array.isArray(data.subtitle) ? data.subtitle[0] : data.subtitle;

			
			const path = title.replace(/[\:\/\\]/gi, '_') + (subtitle ? '_' + subtitle.replace(/\:\/\\/, '') : '') + '.md';
			console.log("path : " + path)
			const files = this.app.vault
					.getMarkdownFiles()
					.filter(f =>{
						return f.name.toLowerCase().trim().normalize() == path.toLowerCase().trim().normalize();
					} )
					console.log(files)

			if (files[0]){
				leaf.openFile(files[0]);
				new Notice('File was already created')
			} else {
				try {
					const file = this.app.vault.create(path, this.template(data)) as TFile;
					console.log(await file)
					leaf.openFile(await file.path);
				} 
				catch (err){
					new Notice("Couln't create a new file.")
					throw err;
				}
			}

		} else {
			new Notice('Cannot find the template');
		}
	};
}


// class RefFillerTab extends PluginSettingTab {
// 	plugin: RefFillerPlugin;

// 	constructor(app: App, plugin: RefFillerPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const {containerEl} = this;

// 		containerEl.empty();

// 		containerEl.createEl('h2', {text: 'RefFiller settings'});

// 		new Setting(containerEl)
// 			.setName('Template path')
// 			.setDesc('File that will be used to fill retrieved metadatas')
// 			.addText(text => text
// 				.setPlaceholder('Template path')
// 				.setValue(this.plugin.settings.templatePath)
// 				.onChange(async (value) => {
// 					this.plugin.settings.templatePath = value;
// 					await this.plugin.saveSettings();
// 				}));
// 	}
// }