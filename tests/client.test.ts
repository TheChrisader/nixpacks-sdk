import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  type MockedFunction,
} from "vitest";
import { NixpacksClient } from "../src/client";
import * as runner from "../src/utils/runner";
import {
  NixpacksCommandError,
  NixpacksNotFoundError,
  NixpacksPlanParseError,
} from "../src/types";

vi.mock("../src/utils/runner");

const mockRunNixpacks = runner.runNixpacks as MockedFunction<
  typeof runner.runNixpacks
>;

const MOCK_PLAN = {
  providers: ["node"],
  phases: {
    setup: { nixPkgs: ["nodejs_20"] },
    install: { cmds: ["npm ci"] },
    build: { cmds: ["npm run build"] },
  },
  start: { cmd: "node dist/index.js" },
};

describe("NixpacksClient.plan", () => {
  let client: NixpacksClient;

  beforeEach(() => {
    client = new NixpacksClient();
    vi.clearAllMocks();
  });

  it("returns a parsed build plan", async () => {
    mockRunNixpacks.mockResolvedValue({
      stdout: JSON.stringify(MOCK_PLAN),
      stderr: "",
      combined: JSON.stringify(MOCK_PLAN),
      exitCode: 0,
    });

    const result = await client.plan("/app");

    expect(result.plan).toEqual(MOCK_PLAN);
    expect(result.raw).toBe(JSON.stringify(MOCK_PLAN));
  });

  it("passes env vars to the runner", async () => {
    mockRunNixpacks.mockResolvedValue({
      stdout: JSON.stringify(MOCK_PLAN),
      stderr: "",
      combined: JSON.stringify(MOCK_PLAN),
      exitCode: 0,
    });

    await client.plan("/app", { env: ["NODE_ENV=production"] });

    const [args] = mockRunNixpacks.mock.calls[0];
    expect(args).toContain("--env");
    expect(args).toContain("NODE_ENV=production");
  });

  it("throws NixpacksPlanParseError on invalid JSON", async () => {
    mockRunNixpacks.mockResolvedValue({
      stdout: "not json {{",
      stderr: "",
      combined: "not json {{",
      exitCode: 0,
    });

    await expect(client.plan("/app")).rejects.toThrow(NixpacksPlanParseError);
  });

  it("propagates NixpacksCommandError from the runner", async () => {
    mockRunNixpacks.mockRejectedValue(
      new NixpacksCommandError({
        exitCode: 1,
        output: "error: something went wrong",
        command: "nixpacks plan /app",
      }),
    );

    await expect(client.plan("/app")).rejects.toThrow(NixpacksCommandError);
  });
});

describe("NixpacksClient.build", () => {
  let client: NixpacksClient;

  beforeEach(() => {
    client = new NixpacksClient();
    vi.clearAllMocks();
  });

  it("returns a build result with imageName", async () => {
    mockRunNixpacks.mockResolvedValue({
      stdout: "",
      stderr: "",
      combined: "Successfully built image",
      exitCode: 0,
    });

    const result = await client.build("/app", { name: "my-app:latest" });

    expect(result.imageName).toBe("my-app:latest");
    expect(result.exitCode).toBe(0);
    expect(result.output).toBe("Successfully built image");
  });

  it("passes --name flag when name is provided", async () => {
    mockRunNixpacks.mockResolvedValue({
      stdout: "",
      stderr: "",
      combined: "",
      exitCode: 0,
    });

    await client.build("/app", { name: "test-image" });

    const [args] = mockRunNixpacks.mock.calls[0];
    expect(args).toContain("--name");
    expect(args).toContain("test-image");
  });

  it("passes --start-cmd when startCmd is provided", async () => {
    mockRunNixpacks.mockResolvedValue({
      stdout: "",
      stderr: "",
      combined: "",
      exitCode: 0,
    });

    await client.build("/app", { startCmd: "node index.js" });

    const [args] = mockRunNixpacks.mock.calls[0];
    expect(args).toContain("--start-cmd");
    expect(args).toContain("node index.js");
  });

  it("calls onLog with streamed lines", async () => {
    const lines: string[] = [];
    mockRunNixpacks.mockImplementation(async (_args, opts) => {
      opts?.onLog?.("line one");
      opts?.onLog?.("line two");
      return {
        stdout: "",
        stderr: "",
        combined: "line one\nline two",
        exitCode: 0,
      };
    });

    await client.build("/app", { onLog: (l) => lines.push(l) });

    expect(lines).toEqual(["line one", "line two"]);
  });

  it("propagates NixpacksNotFoundError", async () => {
    mockRunNixpacks.mockRejectedValue(new NixpacksNotFoundError());
    await expect(client.build("/app")).rejects.toThrow(NixpacksNotFoundError);
  });
});

describe("NixpacksClient.version", () => {
  let client: NixpacksClient;

  beforeEach(() => {
    client = new NixpacksClient();
    vi.clearAllMocks();
  });

  it("returns null when nixpacks is not found", async () => {
    vi.spyOn(client, "version").mockResolvedValue(null);
    expect(await client.version()).toBeNull();
  });

  it("returns a version string when nixpacks is installed", async () => {
    vi.spyOn(client, "version").mockResolvedValue("nixpacks 0.26.0");
    expect(await client.version()).toBe("nixpacks 0.26.0");
  });
});

describe("NixpacksClient.assertInstalled", () => {
  it("throws NixpacksNotFoundError when version() returns null", async () => {
    const client = new NixpacksClient();
    vi.spyOn(client, "version").mockResolvedValue(null);
    await expect(client.assertInstalled()).rejects.toThrow(
      NixpacksNotFoundError,
    );
  });

  it("resolves when version() returns a string", async () => {
    const client = new NixpacksClient();
    vi.spyOn(client, "version").mockResolvedValue("nixpacks 0.26.0");
    await expect(client.assertInstalled()).resolves.toBeUndefined();
  });
});
