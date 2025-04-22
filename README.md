# Obsidian LLAMA Chat Plugin

This plugin integrates a local LLAMA language model with Obsidian, providing an AI chat interface directly within your Obsidian workspace.

## Prerequisites

1. [Obsidian](https://obsidian.md/) installed on your computer
2. [Ollama](https://ollama.ai/) installed on your computer

## Installation Steps

### 1. Install Ollama
1. Download Ollama from [https://ollama.ai/](https://ollama.ai/)
2. Run the installer
3. Follow the installation prompts

### 2. Set Up LLAMA Model
1. Open PowerShell or Command Prompt
2. Pull the LLAMA model by running:
   ```bash
   ollama pull llama2
   ```
3. Wait for the download to complete (this may take a while depending on your internet connection)

### 3. Start the LLAMA Server
1. The Ollama service should start automatically after installation
2. If it's not running, you can start it manually:
   - Windows: Run Ollama from the Start menu
   - Or open PowerShell and run:
     ```bash
     ollama serve
     ```
3. Verify the server is running by executing:
   ```bash
   ollama list
   ```
   You should see `llama2` in the list of models.

### 4. Install the Plugin in Obsidian
1. Open Obsidian
2. Go to Settings → Community plugins
3. Turn off Safe mode if it's enabled
4. Browse for "LLAMA Chat" and install it
5. Enable the plugin

## Using the Plugin

1. Click the chat icon in the left ribbon (looks like a message bubble)
   - Alternatively, use the command palette (Ctrl/Cmd + P) and search for "Open Chat"

2. The chat interface will open in the right sidebar

3. Type your message in the input box and:
   - Press Enter to send
   - Or click the Send button

4. Wait for LLAMA to generate a response
   - You'll see a notification if there are any connection issues
   - The response will appear in the chat when ready

5. Features:
   - Copy button for each AI response
   - Timestamp for each message
   - Message history (configurable in settings)

## Configuration

You can configure the plugin in Obsidian's settings:

1. Go to Settings → Plugin Options → LLAMA Chat
2. Available settings:
   - Maximum History: Number of messages to keep in history (10-1000)
   - LLAMA Endpoint: URL of the local LLAMA API (default: http://localhost:11434/api/generate)

## Troubleshooting

### LLAMA Not Responding
1. Check if Ollama is running:
   ```bash
   netstat -ano | findstr :11434
   ```
   Should show a process listening on port 11434

2. Verify the model is installed:
   ```bash
   ollama list
   ```
   Should show `llama2` in the list

3. Test the LLAMA API directly:
   ```bash
   curl http://localhost:11434/api/generate -X POST -H "Content-Type: application/json" -d "{\"model\": \"llama2\", \"prompt\": \"hello\", \"stream\": false}"
   ```

### Common Issues

1. "Error: listen tcp 127.0.0.1:11434: bind: Only one usage of each socket address..."
   - This means Ollama is already running
   - No action needed, the server is ready to use

2. "Error getting response from LLAMA"
   - Check if Ollama is running
   - Verify the LLAMA endpoint in plugin settings
   - Make sure the llama2 model is installed

3. No response from LLAMA
   - Check your internet connection
   - Restart Ollama service
   - Verify the model installation

## Support

If you encounter any issues or have questions:
1. Check the Troubleshooting section above
2. Visit the [GitHub repository](link-to-your-repo)
3. Submit an issue on GitHub

## License

GNU General Public License v3.0 - see LICENSE file for details. This is free software, and you are welcome to redistribute it under certain conditions.
