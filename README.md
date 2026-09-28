# task-cli

A tiny command-line to-do list manager written in plain Node.js — no dependencies, no database, just a JSON file on disk.

I built this as a small project to practice working with the file system, `argv` parsing, and basic CRUD logic without leaning on a framework.

## Features

- Add tasks with an optional priority and due date
- List tasks, with filtering by status and sorting by due date
- Mark tasks as done
- Remove tasks
- Print quick stats (total, pending, done, high priority)
- Tasks are stored in `tasks.json`, written safely (write to a temp file, then rename) so a crash mid-write can't corrupt your data

## Requirements

- Node.js 18 or newer (uses `node:util`'s `parseArgs` and native ESM)

## Installation

```bash
git clone https://github.com/sami-dev-dz/task-cli.git
cd task-cli
```

No `npm install` needed — there are no dependencies.

Optionally, link it so you can call it as `task` instead of `node task.js`:

```bash
npm link
```

## Usage

```
Usage: node task.js <command> [options]

Commands:
  add "Title" --priority high --due 2026-09-30
  list
  list --status pending
  list --sort due
  done <id>
  rm <id>
  stats
```

### Examples

```bash
# Add a task
node task.js add "Write README" --priority high --due 2026-10-01

# Add a task with no extra info
node task.js add "Buy groceries"

# List everything
node task.js list

# List only pending tasks
node task.js list --status pending

# List sorted by due date (tasks with no date go last)
node task.js list --sort due

# Mark task #1 as done
node task.js done 1

# Remove task #2
node task.js rm 2

# See a quick summary
node task.js stats
```

## Options reference

| Command | Options |
|---|---|
| `add` | `--priority <low\|medium\|high>`, `--due <YYYY-MM-DD>`, `--status <pending\|done>` |
| `list` | `--status <pending\|done>`, `--sort due` |

## Data storage

Tasks live in `tasks.json` in the current directory, created automatically on first run. It's a plain JSON array, so it's easy to inspect or back up by hand:

```json
[
  {
    "id": 1,
    "title": "Write README",
    "status": "pending",
    "priority": "high",
    "due": "2026-10-01"
  }
]
```

`tasks.json` is listed in `.gitignore` since it's local data, not source code.

## Notes on the design

- IDs are never reused: a new task always gets `max(existing ids) + 1`, even after deletions.
- Saving is done via write-then-rename to avoid leaving `tasks.json` half-written if the process is interrupted.
- Dates are validated against real calendar dates (e.g. `2026-02-30` is rejected, not silently accepted).

## License

MIT
