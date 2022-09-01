/*
-------
This plugin is inspired from the Recent Files plugin made by tgrosinger : https://github.com/tgrosinger/recent-files-obsidian.
Some parts of this code has been made by him/her.
-------
*/

import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { RefModal } from 'modal';
import { partials } from 'handlebars';
import { reverse } from 'dns';

const axios = require('axios');
const handlebars = require('handlebars');

interface RefFillerSettings {
	RefFiller: string;
	templatePath: string;
}

const DEFAULT_SETTINGS: RefFillerSettings = {
	RefFiller: 'default',
	templatePath: '/General/Templates/Template fiche de lecture'
}

export default class RefFillerPlugin extends Plugin {
	settings: RefFillerSettings;
	template: any;

	async onload() {
		await this.loadSettings();

		const templatePath = this.settings.templatePath;
		const templateFile = this.app.vault
			.getFiles()
			.find((f) => f.path === templatePath);
		const templateText = await this.app.vault.read(templateFile);
		this.template = handlebars.compile(templateText);

		// This creates an icon in the left ribbon.
		this.addRibbonIcon("book", "Query reference by DOI", () => {
			new RefModal(this.app, (doi) => {
				axios.get('https://api.crossref.org/works/' + doi).then((res : object , err : object) => {
					if (!res){
						new Notice("Cannot find a document with this DOI")
						throw err;
					} 
					let data = res.data.message;
					this.openAndFillTemplate({data});
				})
			}).open();
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new RefFillerTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private readonly openAndFillTemplate = async ({shouldSplit = false, data = {}}) => {
		if (this.template) {
			data.publicationDate = data.published['date-parts'][0].reverse().join('-');
			data.authors = data.author.map(auth => '@' + auth.given + auth.family).join(', ');
			console.log('data', data)
			console.log(this.template(data))

			let leaf = this.app.workspace.getMostRecentLeaf();
			const createLeaf = shouldSplit || leaf.getViewState().pinned;
			if (createLeaf) {
			leaf = this.app.workspace.createLeafBySplit(leaf);
			}
			leaf.openFile(this.template(data));
		} else {
			new Notice('Cannot find a file with the required name');
			// this.plugin.saveData();
			// this.redraw();
		}
	};
}

class RefFillerTab extends PluginSettingTab {
	plugin: RefFillerPlugin;

	constructor(app: App, plugin: RefFillerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'RefFiller settings'});

		new Setting(containerEl)
			.setName('Template path')
			.setDesc('File that will be used to fill retrieved metadatas')
			.addText(text => text
				.setPlaceholder('Template path')
				.setValue(this.plugin.settings.templatePath)
				.onChange(async (value) => {
					this.plugin.settings.templatePath = value;
					await this.plugin.saveSettings();
				}));
	}
}