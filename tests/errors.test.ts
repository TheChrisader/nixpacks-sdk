import { describe, it, expect } from "vitest";
import {
  NixpacksError,
  NixpacksNotFoundError,
  NixpacksCommandError,
  NixpacksPlanParseError,
} from "../src/types";

describe("NixpacksError", () => {
  it("has correct name and message", () => {
    const err = new NixpacksError("base error");
    expect(err.name).toBe("NixpacksError");
    expect(err.message).toBe("base error");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("NixpacksNotFoundError", () => {
  it("has correct name and mentions install URL", () => {
    const err = new NixpacksNotFoundError();
    expect(err.name).toBe("NixpacksNotFoundError");
    expect(err.message).toContain("nixpacks.com");
    expect(err).toBeInstanceOf(NixpacksError);
  });
});

describe("NixpacksCommandError", () => {
  it("stores exitCode, output, and command", () => {
    const err = new NixpacksCommandError({
      exitCode: 1,
      output: "build failed",
      command: "nixpacks build /app",
    });

    expect(err.name).toBe("NixpacksCommandError");
    expect(err.exitCode).toBe(1);
    expect(err.output).toBe("build failed");
    expect(err.command).toBe("nixpacks build /app");
    expect(err.message).toContain("1");
    expect(err).toBeInstanceOf(NixpacksError);
  });

  it("uses a custom message when provided", () => {
    const err = new NixpacksCommandError({
      exitCode: 2,
      output: "something",
      command: "nixpacks plan /app",
      message: "custom message here",
    });
    expect(err.message).toBe("custom message here");
  });
});

describe("NixpacksPlanParseError", () => {
  it("stores raw output and has correct name", () => {
    const err = new NixpacksPlanParseError("not-json", new SyntaxError("oops"));
    expect(err.name).toBe("NixpacksPlanParseError");
    expect(err.raw).toBe("not-json");
    expect(err.message).toContain("oops");
    expect(err).toBeInstanceOf(NixpacksError);
  });
});
