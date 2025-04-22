# Obsidian Plugin Development Guide

This guide explains how to create plugins for Obsidian, using the Cyberpunk Combat Tracker plugin as a practical example. The guide is structured to be easily understood by AI agents and developers alike.

## 1. Project Structure

An Obsidian plugin typically follows this structure:
```
plugin-name/
├── manifest.json      # Plugin metadata and configuration
├── main.ts           # Main plugin code (TypeScript)
├── main.js           # Compiled JavaScript
├── styles.css        # Plugin-specific styles
├── package.json      # Node.js dependencies and scripts
├── tsconfig.json     # TypeScript configuration
└── esbuild.config.mjs # Build configuration
```

## 2. Core Components

### 2.1 Manifest Configuration (manifest.json)
```json
{
    "id": "plugin-id",
    "name": "Plugin Name",
    "version": "1.0.0",
    "minAppVersion": "0.15.0",
    "description": "Plugin description",
    "author": "Your Name",
    "authorUrl": "https://your-url.com",
    "isDesktopOnly": false
}
```

### 2.2 Plugin Class (main.ts)
The main plugin class extends Obsidian's `Plugin` class:
```typescript
export default class MyPlugin extends Plugin {
    async onload() {
        // Plugin initialization
    }
    
    async onunload() {
        // Cleanup
    }
}
```

### 2.3 View Classes
Custom views extend `ItemView`:
```typescript
class MyView extends ItemView {
    getViewType(): string {
        return "my-view";
    }
    
    getDisplayText(): string {
        return "My View";
    }
    
    async onOpen(): Promise<void> {
        // View initialization
    }
}
```

## 3. Key Concepts

### 3.1 Views
- Views are UI components that can be added to Obsidian's interface
- They can be registered as leaf types
- Example from Cyberpunk Combat Tracker:
```typescript
this.registerView(
    VIEW_TYPE_COMBAT_TRACKER,
    (leaf) => new CombatTrackerView(leaf)
);
```

### 3.2 Commands
Commands can be registered to add functionality:
```typescript
this.addCommand({
    id: 'my-command',
    name: 'My Command',
    callback: () => {
        // Command logic
    }
});
```

### 3.3 Settings
Plugins can have configurable settings:
```typescript
interface MyPluginSettings {
    setting1: string;
    setting2: number;
}

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;
    
    async onload() {
        await this.loadSettings();
        this.addSettingTab(new MySettingTab(this.app, this));
    }
}
```

## 4. Development Workflow

### 4.1 Setup
1. Create a new directory for your plugin
2. Initialize npm: `npm init -y`
3. Install dependencies:
```bash
npm install --save-dev obsidian
npm install --save-dev typescript
npm install --save-dev @types/node
```

### 4.2 Development
1. Create your plugin files
2. Use TypeScript for type safety
3. Test in development mode:
```bash
npm run dev
```

### 4.3 Building
Build for production:
```bash
npm run build
```

## 5. Best Practices

### 5.1 Type Safety
- Use TypeScript for better type checking
- Define interfaces for your data structures
- Example from Cyberpunk Combat Tracker:
```typescript
interface Character {
    type: CharacterType;
    init: number;
    name: string;
    // ... other properties
}
```

### 5.2 UI Components
- Use Obsidian's built-in UI components
- Follow Obsidian's design patterns
- Example from Cyberpunk Combat Tracker:
```typescript
private createStat(container: HTMLElement, label: string, value: string) {
    const stat = container.createDiv({ cls: 'stat' });
    stat.createSpan({ text: label });
    stat.createSpan({ text: value });
}
```

### 5.3 State Management
- Keep state in your plugin class
- Update UI when state changes
- Example from Cyberpunk Combat Tracker:
```typescript
private characters: Character[] = [];
private render() {
    // Update UI based on characters array
}
```

## 6. Testing and Debugging

### 6.1 Development Mode
- Use `npm run dev` for development
- Changes are automatically reloaded
- Console logs appear in Obsidian's developer tools

### 6.2 Error Handling
- Use try-catch blocks
- Show user-friendly error messages
- Example:
```typescript
try {
    // Operation
} catch (error) {
    new Notice("Error: " + error.message);
}
```

## 7. Publishing

### 7.1 Version Management
- Update version in manifest.json
- Use semantic versioning
- Example version bump script:
```javascript
// version-bump.mjs
const version = process.argv[2];
// Update manifest.json
```

### 7.2 Distribution
- Build your plugin
- Create a release on GitHub
- Submit to Obsidian's plugin directory

## 8. Resources

- [Obsidian Plugin API Documentation](https://docs.obsidian.md)
- [Obsidian Plugin Developer Discord](https://discord.gg/veuWUTm)
- [Sample Plugin Repository](https://github.com/obsidianmd/obsidian-sample-plugin)

## 9. Example Plugin Analysis

The Cyberpunk Combat Tracker plugin demonstrates several key concepts:

1. **Custom Views**: Implements a combat tracker view with character management
2. **State Management**: Maintains character state and updates UI accordingly
3. **User Interaction**: Handles various user actions (add, edit, delete characters)
4. **Styling**: Uses CSS for custom styling of the combat tracker
5. **Type Safety**: Uses TypeScript interfaces for character data

This structure provides a solid foundation for building complex Obsidian plugins.
