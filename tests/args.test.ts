import { describe, it, expect } from "vitest";
import {
  buildBaseArgs,
  buildBuildArgs,
  buildPlanArgs,
} from "../src/utils/args";

describe("buildBaseArgs", () => {
  it("returns empty array for empty options", () => {
    expect(buildBaseArgs({})).toEqual([]);
  });

  it("maps env vars to --env flags", () => {
    expect(
      buildBaseArgs({ env: ["NODE_ENV=production", "PORT=3000"] }),
    ).toEqual(["--env", "NODE_ENV=production", "--env", "PORT=3000"]);
  });

  it("maps pkgs to --pkgs flags", () => {
    expect(buildBaseArgs({ pkgs: ["ffmpeg", "jq"] })).toEqual([
      "--pkgs",
      "ffmpeg",
      "--pkgs",
      "jq",
    ]);
  });

  it("maps aptPkgs to --apt flags", () => {
    expect(buildBaseArgs({ aptPkgs: ["wget"] })).toEqual(["--apt", "wget"]);
  });

  it("maps libs to --libs flags", () => {
    expect(buildBaseArgs({ libs: ["gcc-unwrapped"] })).toEqual([
      "--libs",
      "gcc-unwrapped",
    ]);
  });

  it("maps providers to --provider flags", () => {
    expect(buildBaseArgs({ providers: ["node"] })).toEqual([
      "--provider",
      "node",
    ]);
  });

  it("maps config to --config flag", () => {
    expect(buildBaseArgs({ config: "./nixpacks.toml" })).toEqual([
      "--config",
      "./nixpacks.toml",
    ]);
  });

  it("combines multiple options", () => {
    const args = buildBaseArgs({
      env: ["A=1"],
      pkgs: ["ffmpeg"],
      config: "./cfg.toml",
    });
    expect(args).toContain("--env");
    expect(args).toContain("A=1");
    expect(args).toContain("--pkgs");
    expect(args).toContain("ffmpeg");
    expect(args).toContain("--config");
    expect(args).toContain("./cfg.toml");
  });
});

describe("buildPlanArgs", () => {
  it("starts with 'plan' and the source path", () => {
    const args = buildPlanArgs("/app", {});
    expect(args[0]).toBe("plan");
    expect(args[1]).toBe("/app");
  });

  it("appends base args after source path", () => {
    const args = buildPlanArgs("/app", { env: ["FOO=bar"] });
    expect(args).toContain("--env");
    expect(args).toContain("FOO=bar");
  });
});

describe("buildBuildArgs", () => {
  it("starts with 'build' and the source path", () => {
    const args = buildBuildArgs("/app", {});
    expect(args[0]).toBe("build");
    expect(args[1]).toBe("/app");
  });

  it("appends --name when provided", () => {
    const args = buildBuildArgs("/app", { name: "my-image:latest" });
    expect(args).toContain("--name");
    expect(args).toContain("my-image:latest");
  });

  it("appends --start-cmd when provided", () => {
    const args = buildBuildArgs("/app", { startCmd: "node server.js" });
    expect(args).toContain("--start-cmd");
    expect(args).toContain("node server.js");
  });

  it("omits --name and --start-cmd when not provided", () => {
    const args = buildBuildArgs("/app", {});
    expect(args).not.toContain("--name");
    expect(args).not.toContain("--start-cmd");
  });
});
