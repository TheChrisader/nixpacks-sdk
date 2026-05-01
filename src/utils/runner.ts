import { spawn } from "child_process";
import { NixpacksCommandError, NixpacksNotFoundError } from "../types/index";

export interface RunResult {
  stdout: string;
  stderr: string;
  combined: string;
  exitCode: number;
}

export interface RunOptions {
  cwd?: string;
  onLog?: (line: string) => void;
}

/**
 * Spawn the nixpacks binary with the given args, capturing all output.
 * Rejects with a typed error on non-zero exit or if the binary is missing.
 */
export async function runNixpacks(
  args: string[],
  opts: RunOptions = {},
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("nixpacks", args, {
      cwd: opts.cwd ?? process.cwd(),
      env: process.env,
      shell: false,
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    const combinedChunks: string[] = [];

    // Buffer for partial lines (so onLog fires per-line, not per-chunk)
    let lineBuffer = "";

    const pushLine = (chunk: string) => {
      lineBuffer += chunk;
      const lines = lineBuffer.split("\n");
      // Everything except the last element is a complete line
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        combinedChunks.push(line);
        opts.onLog?.(line);
      }
      lineBuffer = lines[lines.length - 1];
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
      pushLine(chunk.toString("utf8"));
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
      pushLine(chunk.toString("utf8"));
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(new NixpacksNotFoundError());
      } else {
        reject(
          new NixpacksCommandError({
            exitCode: -1,
            output: err.message,
            command: `nixpacks ${args.join(" ")}`,
            message: `Failed to spawn nixpacks: ${err.message}`,
          }),
        );
      }
    });

    child.on("close", (code) => {
      // Flush any remaining partial line
      if (lineBuffer.length > 0) {
        combinedChunks.push(lineBuffer);
        opts.onLog?.(lineBuffer);
        lineBuffer = "";
      }

      const exitCode = code ?? 1;
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      const combined = combinedChunks.join("\n");

      if (exitCode !== 0) {
        reject(
          new NixpacksCommandError({
            exitCode,
            output: combined || stderr,
            command: `nixpacks ${args.join(" ")}`,
          }),
        );
        return;
      }

      resolve({ stdout, stderr, combined, exitCode });
    });
  });
}
