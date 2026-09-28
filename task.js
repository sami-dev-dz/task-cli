import fs from "fs/promises";
import { parseArgs } from "util";

// file where I keep the tasks
const FILE = "tasks.json";

const PRIORITIES = ["low", "medium", "high"];
const STATUSES = ["pending", "done"];

const HELP = `
Usage: node task.js <command> [options]

Commands:
  add "Title" --priority high --due 2026-09-30
  list
  list --status pending
  list --sort due
  done <id>
  rm <id>
  stats
`;

// print an error message and stop the program with code 1
function fail(message) {
  console.error("Error: " + message);
  process.exit(1);
}

// save the tasks safely:
// write to a temp file first, then rename it,
// so if the program stops in the middle the real file is not broken
async function saveTasks(tasks) {
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(tasks, null, 2));
  await fs.rename(tmp, FILE);
}

// read the tasks from the file
async function loadTasks() {
  let text;

  try {
    text = await fs.readFile(FILE, "utf-8");
  } catch (error) {
    if (error.code === "ENOENT") {
      // first time: the file doesn't exist yet, so create it
      await saveTasks([]);
      return [];
    }
    fail(error.message);
  }

  let tasks;
  try {
    tasks = JSON.parse(text);
  } catch {
    fail(`${FILE} is corrupted (invalid JSON). Fix it or delete it.`);
  }

  if (!Array.isArray(tasks)) {
    fail(`${FILE} has a wrong format (it should be an array).`);
  }

  return tasks;
}

// check that the id is a real number
function getId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    fail("ID must be a positive number.");
  }
  return id;
}

// check the date looks like YYYY-MM-DD and is a real date
function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  // this also catches dates like 2026-02-30
  return date.toISOString().slice(0, 10) === value;
}

function printTask(task) {
  const priority = task.priority ?? "-";
  const due = task.due ?? "-";
  console.log(
    `${task.id}. ${task.title} | ${priority} | ${due} | ${task.status}`,
  );
}

// ---------- commands ----------

async function addTask(tasks, values, words) {
  // the title is everything that is not an option
  const title = words.join(" ").trim();

  if (!title) {
    fail("Task title is required.");
  }
  if (values.priority && !PRIORITIES.includes(values.priority)) {
    fail(`Priority must be one of: ${PRIORITIES.join(", ")}.`);
  }
  if (values.status && !STATUSES.includes(values.status)) {
    fail(`Status must be one of: ${STATUSES.join(", ")}.`);
  }
  if (values.due && !isValidDate(values.due)) {
    fail("Due date must be a real date like 2026-09-30.");
  }

  // new id = biggest id + 1 (so I never reuse a deleted id)
  let maxId = 0;
  for (const task of tasks) {
    if (task.id > maxId) maxId = task.id;
  }

  const newTask = {
    id: maxId + 1,
    title: title,
    status: values.status || "pending",
  };
  if (values.priority) newTask.priority = values.priority;
  if (values.due) newTask.due = values.due;

  tasks.push(newTask);
  await saveTasks(tasks);

  console.log(`Task ${newTask.id} added.`);
}

function listTasks(tasks, values) {
  // copy the array so sorting doesn't change the original
  let result = [...tasks];

  if (values.status) {
    if (!STATUSES.includes(values.status)) {
      fail(`Status must be one of: ${STATUSES.join(", ")}.`);
    }
    result = result.filter((task) => task.status === values.status);
  }

  if (values.sort) {
    if (values.sort !== "due") {
      fail('You can only sort by "due".');
    }
    result.sort((a, b) => {
      // tasks without a date go at the end
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return new Date(a.due) - new Date(b.due);
    });
  }

  if (result.length === 0) {
    console.log("No tasks found.");
    return;
  }

  for (const task of result) {
    printTask(task);
  }
}

async function markDone(tasks, words) {
  const id = getId(words[0]);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    fail(`Task ${id} not found.`);
  }

  task.status = "done";
  await saveTasks(tasks);
  console.log(`Task ${id} is done.`);
}

async function removeTask(tasks, words) {
  const id = getId(words[0]);
  const remaining = tasks.filter((t) => t.id !== id);

  // if the length is the same, nothing was removed
  if (remaining.length === tasks.length) {
    fail(`Task ${id} not found.`);
  }

  await saveTasks(remaining);
  console.log(`Task ${id} removed.`);
}

function showStats(tasks) {
  const pending = tasks.filter((t) => t.status === "pending").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const high = tasks.filter((t) => t.priority === "high").length;

  console.log(`Total: ${tasks.length}`);
  console.log(`Pending: ${pending}`);
  console.log(`Done: ${done}`);
  console.log(`High priority: ${high}`);
}

// ---------- main ----------

async function main() {
  let parsed;

  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      options: {
        priority: { type: "string" },
        due: { type: "string" },
        status: { type: "string" },
        sort: { type: "string" },
      },
    });
  } catch (error) {
    // unknown option or missing value (like "--priority" with nothing after)
    fail(error.message);
  }

  const values = parsed.values;
  const command = parsed.positionals[0];
  const words = parsed.positionals.slice(1);

  // no command = show the help
  if (!command) {
    console.log(HELP);
    return;
  }

  const tasks = await loadTasks();

  if (command === "add") {
    await addTask(tasks, values, words);
  } else if (command === "list") {
    listTasks(tasks, values);
  } else if (command === "done") {
    await markDone(tasks, words);
  } else if (command === "rm") {
    await removeTask(tasks, words);
  } else if (command === "stats") {
    showStats(tasks);
  } else {
    fail(
      `Unknown command "${command}". Run with no arguments to see the help.`,
    );
  }
}

main();
