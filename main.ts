import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf, TFile, setIcon } from 'obsidian';

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
	includeContext: boolean;
	contextPrompt: string;
}

const DEFAULT_SETTINGS: ChatPluginSettings = {
	chatHistory: [],
	maxHistory: 100,
	llamaEndpoint: 'http://localhost:11434/api/generate',
	includeContext: true,
	contextPrompt: "Consider the following note content as context for your response:\n\n{context}\n\nNow answer the following question:\n{prompt}"
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

	private async getCurrentNoteContent(): Promise<string | null> {
		// Try getting the active view first
		let activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		
		// If no active view, try getting the last visible leaf with a markdown view
		if (!activeView) {
			this.plugin.log('No active Markdown view found, checking visible leaves');
			const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
			if (markdownLeaves.length > 0) {
				const lastMarkdownLeaf = markdownLeaves[markdownLeaves.length - 1];
				if (lastMarkdownLeaf.view instanceof MarkdownView) {
					activeView = lastMarkdownLeaf.view;
					this.plugin.log('Found Markdown view in visible leaves');
				} else {
					this.plugin.log('No Markdown view found in visible leaves');
				}
			} else {
				this.plugin.log('No Markdown leaves found in workspace');
			}
		} else {
			this.plugin.log('Found active Markdown view');
		}

		if (!activeView) {
			new Notice('Please open a note to use as context');
			return null;
		}

		const file = activeView.file;
		if (!file) {
			this.plugin.log('No file associated with the Markdown view');
			return null;
		}

		try {
			const content = await this.app.vault.read(file);
			this.plugin.log('Retrieved note content from:', file.path);
			return content;
		} catch (error) {
			this.plugin.log('Error reading file:', error);
			return null;
		}
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
			let finalPrompt = content;
			
			// Include current note content as context if enabled
			if (this.plugin.settings.includeContext) {
				this.plugin.log('Attempting to get note content for context');
				const noteContent = await this.getCurrentNoteContent();
				if (noteContent) {
					this.plugin.log('Using note content as context');
					finalPrompt = this.plugin.settings.contextPrompt
						.replace('{context}', noteContent)
						.replace('{prompt}', content);
					this.plugin.log('Final prompt with context:', finalPrompt);
				} else {
					this.plugin.log('No note content available for context');
				}
			} else {
				this.plugin.log('Context inclusion is disabled in settings');
			}

			const response = await this.getLLAMAResponse(finalPrompt);
			const assistantMessage: ChatMessage = {
				id: Date.now().toString(),
				content: response,
				sender: 'assistant',
				timestamp: Date.now()
			};
			this.addMessage(assistantMessage);
		} catch (error) {
			this.plugin.log('Error getting response from LLAMA:', error);
			new Notice('Error getting response from LLAMA: ' + error);
		} finally {
			this.isGenerating = false;
		}
	}

	private async getLLAMAResponse(prompt: string): Promise<string> {
		try {
			this.plugin.log('Sending request to LLAMA with prompt:', prompt);
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
			this.plugin.log('Received response from LLAMA:', data);
			return data.response;
		} catch (error) {
			this.plugin.log('Error calling LLAMA:', error);
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

		// Add copy button for all messages
		const copyButton = messageHeader.createEl('button', {
			cls: 'copy-button'
		});
		
		setIcon(copyButton, 'documents');
		
		copyButton.addEventListener('click', () => {
			navigator.clipboard.writeText(message.content).then(() => {
				setIcon(copyButton, 'check');
				setTimeout(() => {
					setIcon(copyButton, 'documents');
				}, 1000);
				new Notice('Message copied to clipboard!');
			}).catch(err => {
				setIcon(copyButton, 'x');
				setTimeout(() => {
					setIcon(copyButton, 'documents');
				}, 1000);
				new Notice('Failed to copy message: ' + err);
			});
		});
		
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

	log(...args: any[]) {
		console.log('[Obsidillama]', ...args);
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

		new Setting(containerEl)
			.setName('Include Note Context')
			.setDesc('Include the current note content as context for LLAMA')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeContext)
				.onChange(async (value) => {
					this.plugin.settings.includeContext = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Context Prompt Template')
			.setDesc('Template for how to include context in the prompt. Use {context} for note content and {prompt} for user message.')
			.addTextArea(text => text
				.setPlaceholder(DEFAULT_SETTINGS.contextPrompt)
				.setValue(this.plugin.settings.contextPrompt)
				.onChange(async (value) => {
					this.plugin.settings.contextPrompt = value;
					await this.plugin.saveSettings();
				}));
	}
}
