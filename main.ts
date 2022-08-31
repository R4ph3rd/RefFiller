/*
-------
This plugin is inspired from the Recent Files plugin made by tgrosinger : https://github.com/tgrosinger/recent-files-obsidian.
Some parts of this code has been made by him/her.
-------
*/

import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { RefModal } from 'modal';

const axios = require('axios');

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

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon("book", "Query reference by DOI", () => {
			new RefModal(this.app, (doi) => {
				axios.get('https://api.crossref.org/works/' + doi).then((res : object , err : object) => {
					if (!res){
						new Notice("Cannot find a document with this DOI")
						throw err;
					} 
					const data = res.data.message;
					console.log('data', data)
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

	private readonly openAndFillTemplate = ({shouldSplit = false, data = {}}) => {
		console.log('open fill function ', this.settings)
		const filePath = this.settings.templatePath;
		console.log(filePath)
		const targetFile = this.app.vault
			.getFiles()
			.find((f) => f.path === filePath);
	
		if (targetFile) {
			let leaf = this.app.workspace.getMostRecentLeaf();
	
			const createLeaf = shouldSplit || leaf.getViewState().pinned;
			if (createLeaf) {
			leaf = this.app.workspace.createLeafBySplit(leaf);
			}
			leaf.openFile(targetFile);
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
