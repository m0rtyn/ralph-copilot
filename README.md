<p align="center">
  <img src="assets/demo.gif" alt="Ralph Demo" width="100%">
</p>

<p align="center">
  <a href="https://github.com/aymenfurter/ralph/releases"><img src="https://img.shields.io/github/v/release/aymenfurter/ralph?style=flat-square" alt="GitHub Release"></a>
  <a href="https://github.com/aymenfurter/ralph/blob/main/LICENSE"><img src="https://img.shields.io/github/license/aymenfurter/ralph?style=flat-square" alt="License"></a>
  <a href="https://github.com/aymenfurter/ralph/stargazers"><img src="https://img.shields.io/github/stars/aymenfurter/ralph?style=flat-square" alt="GitHub Stars"></a>
  <a href="https://github.com/aymenfurter/ralph/issues"><img src="https://img.shields.io/github/issues/aymenfurter/ralph?style=flat-square" alt="GitHub Issues"></a>
</p>

> [!WARNING]
> **UNOFFICIAL & EXPERIMENTAL** - This extension relies on internal VS Code workbench commands (`workbench.action.chat.newEditSession`, `workbench.action.chat.open`) that are **not part of the official public API**. These commands may change or be removed in any VS Code update.

An implementation of [Geoffrey Huntley's Ralph technique](https://ghuntley.com/ralph/) for GitHub Copilot.

Ralph runs AI coding agents in a loop. It reads a PRD, picks tasks, implements them one at a time, and continues until everything is done.

## Features

- **Autonomous Task Execution** - Automatically works through your PRD task list
- **Visual Control Panel** - Start, pause, stop, and monitor progress
- **Progress Timeline** - Watch tasks complete with timing visualization
- **PRD Generation** - Describe what you want to build and Ralph creates the task list
- **Acceptance Criteria** - Optionally require tests, linting, type checking before moving on
- **Fresh Chat Mode** - Start each task with a clean context

## Quick Start

### Generate a PRD from a Description

1. Open the Ralph Control Panel (click the Ralph icon in the Activity Bar)
2. Describe what you want to build in the text area
3. Click **Generate PRD & Tasks**
4. Click **Start** to begin autonomous development

### Use an Existing PRD

Create a `PRD.md` file in your workspace root:

```markdown
# My Project

## Overview
Brief description of what you're building.

## Tasks
- [ ] Set up project structure with dependencies
- [ ] Create core data models and types
- [ ] Implement main application logic
- [ ] Add user interface and styling
- [ ] Write tests and documentation
```

Then open the Control Panel and click **Start**.

## How It Works

1. Read PRD.md
2. Find next unchecked task
3. Send task to Copilot Agent Mode
4. Copilot implements the task
5. Copilot marks task complete
6. Repeat until all tasks done

## Configuration

### Custom File Paths

By default, Ralph looks for `PRD.md` and `progress.txt` in your workspace root. You can configure custom paths to organize these files differently:

**Settings:**

| Setting                    | Default        | Description                        |
| -------------------------- | -------------- | ---------------------------------- |
| `ralph.files.prdPath`      | `PRD.md`       | Path to your PRD file              |
| `ralph.files.progressPath` | `progress.txt` | Path to the progress tracking file |

**Example: Store Ralph files in a `.ralph` folder**

Add to your `.vscode/settings.json`:

```json
{
  "ralph.files.prdPath": ".ralph/PRD.md",
  "ralph.files.progressPath": ".ralph/progress.txt"
}
```

**Example: Use a `docs` folder**

```json
{
  "ralph.files.prdPath": "docs/requirements.md",
  "ralph.files.progressPath": "docs/progress.log"
}
```

> **Note:** Ralph automatically creates parent directories if they don't exist. For example, if you set the path to `.ralph/PRD.md`, Ralph will create the `.ralph` folder when generating a new PRD.

### Custom Prompt Templates

You can customize the prompts Ralph sends to Copilot:

| Setting                                    | Description                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `ralph.prompt.customTemplate`              | Override the task execution prompt. Variables: `{{task}}`, `{{prd}}`, `{{progress}}`, `{{requirements}}`, `{{workspace}}` |
| `ralph.prompt.customPrdGenerationTemplate` | Override the PRD generation prompt. Variables: `{{task}}`, `{{workspace}}`                                                |

## Requirements

- VS Code 1.93 or later
- GitHub Copilot Chat extension

## License

MIT
