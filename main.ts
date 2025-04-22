import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf } from 'obsidian';

// Remember to rename these classes and interfaces!

interface ChatMessage {
	id: string;
	content: string;
	sender: 'user' | 'assistant';
	timestamp: number;
}

interface ChatPluginSettings {
	chatHistory: ChatMessage[];
	maxHistory: number;
	llamaEndpoint: string;
}

const DEFAULT_SETTINGS: ChatPluginSettings = {
	chatHistory: [],
	maxHistory: 100,
	llamaEndpoint: 'http://localhost:11434/api/generate'
}

const VIEW_TYPE_CHAT = "chat-view";

class ChatView extends ItemView {
	private messagesContainer: HTMLElement;
	private inputContainer: HTMLElement;
	private inputEl: HTMLTextAreaElement;
	private isGenerating: boolean = false;
	private plugin: ChatPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: ChatPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_CHAT;
	}

	getDisplayText(): string {
		return "Chat";
	}

	getIcon(): string {
		return "message-square";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('chat-container');

		// Create messages container
		this.messagesContainer = container.createDiv('messages-container');
		
		// Create input container
		this.inputContainer = container.createDiv('input-container');
		this.inputEl = this.inputContainer.createEl('textarea', {
			placeholder: 'Type your message...',
			cls: 'chat-input'
		});
		
		const sendButton = this.inputContainer.createEl('button', {
			text: 'Send',
			cls: 'send-button'
		});

		sendButton.addEventListener('click', () => this.handleSendMessage());
		this.inputEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.handleSendMessage();
			}
		});
	}

	private async handleSendMessage(): Promise<void> {
		if (this.isGenerating) {
			new Notice('Please wait for the current response to complete');
			return;
		}

		const content = this.inputEl.value.trim();
		if (!content) return;

		const message: ChatMessage = {
			id: Date.now().toString(),
			content,
			sender: 'user',
			timestamp: Date.now()
		};

		this.addMessage(message);
		this.inputEl.value = '';
		this.isGenerating = true;
		
		try {
			const response = await this.getLLAMAResponse(content);
			const assistantMessage: ChatMessage = {
				id: Date.now().toString(),
				content: response,
				sender: 'assistant',
				timestamp: Date.now()
			};
			this.addMessage(assistantMessage);
		} catch (error) {
			console.error('Error getting response from LLAMA:', error);
			new Notice('Error getting response from LLAMA: ' + error);
		} finally {
			this.isGenerating = false;
		}
	}

	private async getLLAMAResponse(prompt: string): Promise<string> {
		try {
			const response = await fetch(this.plugin.settings.llamaEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: 'llama2',
					prompt: prompt,
					stream: false
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return data.response;
		} catch (error) {
			console.error('Error calling LLAMA:', error);
			throw error;
		}
	}

	private addMessage(message: ChatMessage): void {
		const messageEl = this.messagesContainer.createDiv({
			cls: `message ${message.sender}`
		});
		
		const messageHeader = messageEl.createDiv('message-header');
		const contentEl = messageEl.createDiv('message-content');
		contentEl.setText(message.content);
		
		const timestampEl = messageHeader.createDiv('message-timestamp');
		timestampEl.setText(new Date(message.timestamp).toLocaleTimeString());

		// Add copy button for assistant messages
		if (message.sender === 'assistant') {
			const copyButton = messageHeader.createEl('button', {
				cls: 'copy-button',
				text: 'Copy'
			});
			
			copyButton.addEventListener('click', () => {
				navigator.clipboard.writeText(message.content).then(() => {
					new Notice('Message copied to clipboard!');
				}).catch(err => {
					new Notice('Failed to copy message: ' + err);
				});
			});
		}
		
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}
}

export default class ChatPlugin extends Plugin {
	settings: ChatPluginSettings;

	async onload() {
		await this.loadSettings();

		// Register the chat view
		this.registerView(
			VIEW_TYPE_CHAT,
			(leaf) => new ChatView(leaf, this)
		);

		// Add ribbon icon to open chat
		this.addRibbonIcon('message-square', 'Open Chat', () => {
			this.activateView();
		});

		// Add command to open chat
		this.addCommand({
			id: 'open-chat',
			name: 'Open Chat',
			callback: () => {
				this.activateView();
			}
		});

		// Add settings tab
		this.addSettingTab(new ChatSettingsTab(this.app, this));
	}

	private async activateView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CHAT);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: VIEW_TYPE_CHAT, active: true });
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	onunload() {
		this.app.workspace.getLeavesOfType(VIEW_TYPE_CHAT).forEach(leaf => {
			leaf.detach();
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ChatSettingsTab extends PluginSettingTab {
	plugin: ChatPlugin;

	constructor(app: App, plugin: ChatPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Maximum History')
			.setDesc('Maximum number of messages to keep in history')
			.addSlider(slider => slider
				.setLimits(10, 1000, 10)
				.setValue(this.plugin.settings.maxHistory)
				.onChange(async (value) => {
					this.plugin.settings.maxHistory = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('LLAMA Endpoint')
			.setDesc('URL of the local LLAMA API endpoint')
			.addText(text => text
				.setPlaceholder('http://localhost:11434/api/generate')
				.setValue(this.plugin.settings.llamaEndpoint)
				.onChange(async (value) => {
					this.plugin.settings.llamaEndpoint = value;
					await this.plugin.saveSettings();
				}));
	}
}
