# nixpacks-sdk

A typed Node.js SDK for the [Nixpacks](https://nixpacks.com) CLI.  
Plan and build Docker images from source, with full TypeScript types, streaming log support, and typed errors.

---

## Requirements

- Node.js ≥ 20
- [`nixpacks`](https://nixpacks.com/docs/getting-started) installed and on your `PATH`

---

## Installation

```bash
npm install nixpacks-sdk
```

---

## Quick start

```ts
import { NixpacksClient } from "nixpacks-sdk";

const nixpacks = new NixpacksClient();

// Check nixpacks is installed
await nixpacks.assertInstalled();

// Generate a build plan
const { plan } = await nixpacks.plan("./my-app");
console.log(plan.phases?.setup?.nixPkgs); // ["nodejs_20", ...]

// Build a Docker image
const result = await nixpacks.build("./my-app", {
  name: "my-app:latest",
  onLog: (line) => console.log(line), // stream build output live
});
console.log("Built:", result.imageName);
```

---

## API

### `new NixpacksClient()`

Creates a new client instance. Stateless and safe to reuse across calls.

---

### `client.plan(srcPath, options?)`

Runs `nixpacks plan` and returns the parsed build plan.

```ts
const { plan, raw } = await nixpacks.plan("./my-app", {
  env: ["NODE_ENV=production"],
  pkgs: ["ffmpeg"],
});
```

**Returns:** `Promise<NixpacksPlanResult>`

---

### `client.build(srcPath, options?)`

Runs `nixpacks build` and produces a Docker image.

```ts
const result = await nixpacks.build("./my-app", {
  name: "my-app:latest",
  startCmd: "node dist/server.js",
  env: ["NODE_ENV=production", "PORT=8080"],
  onLog: (line) => process.stdout.write(line + "\n"),
});
```

**Returns:** `Promise<NixpacksBuildResult>`

---

### `client.version()`

Returns the installed nixpacks version string, or `null` if not found.

```ts
const v = await nixpacks.version();
// "nixpacks 0.26.0" | null
```

---

### `client.assertInstalled()`

Throws `NixpacksNotFoundError` if the `nixpacks` binary is not on `PATH`. Useful as a startup assertion.

```ts
await nixpacks.assertInstalled();
```

---

## Options reference

All options are optional. `plan` and `build` share the base options:

- **`env`** `string[]`: env vars (`KEY=VALUE` or `KEY` to inherit from process)
- **`pkgs`** `string[]`: additional Nix packages to install
- **`aptPkgs`** `string[]`: additional apt packages to install
- **`libs`** `string[]`: Nix packages appended to `LD_LIBRARY_PATH`
- **`providers`** `string[]`: override auto-detected providers (e.g. `["node"]`)
- **`config`** `string`: path to a `nixpacks.toml` / `nixpacks.json` config file
- **`cwd`** `string`: working directory for the nixpacks process

Build-only options:

- **`name`** `string`: image name/tag (e.g. `"my-app:latest"`)
- **`startCmd`** `string`: override the container start command
- **`quiet`** `boolean`: suppress passing output to `onLog`
- **`onLog`** `(line: string) => void`: callback for each line of build output

---

## Error handling

The SDK throws typed errors so you can handle failure cases precisely:

```ts
import {
  NixpacksNotFoundError,
  NixpacksCommandError,
  NixpacksPlanParseError,
} from "nixpacks-sdk";

try {
  await nixpacks.build("./my-app");
} catch (err) {
  if (err instanceof NixpacksNotFoundError) {
    console.error("nixpacks is not installed");
  } else if (err instanceof NixpacksCommandError) {
    console.error(`Build failed (exit ${err.exitCode}):\n${err.output}`);
  } else {
    throw err;
  }
}
```

- **`NixpacksNotFoundError`**: `nixpacks` binary not found on `PATH`
- **`NixpacksCommandError`**: `nixpacks` process exits with a non-zero code
- **`NixpacksPlanParseError`**: `nixpacks plan` output is not valid JSON
- **`NixpacksError`**: base class; all SDK errors extend this

---

## Working with build plans

The `NixpacksBuildPlan` type mirrors the full Nixpacks plan structure. You can save and replay plans:

```ts
import { writeFileSync, readFileSync } from "fs";
import { NixpacksClient, NixpacksBuildPlan } from "nixpacks-sdk";

const nixpacks = new NixpacksClient();

// Save a plan
const { raw } = await nixpacks.plan("./my-app");
writeFileSync("build-plan.json", raw);

// Replay it later via --config
await nixpacks.build("./my-app", {
  config: "build-plan.json",
  name: "my-app:reproducible",
});
```

---

## nixpacks.toml support

Point the `config` option at your `nixpacks.toml`:

```ts
await nixpacks.build("./my-app", {
  config: "./nixpacks.toml",
  name: "my-app:custom",
});
```

Example `nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ["...", "ffmpeg"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "node dist/server.js"
```
