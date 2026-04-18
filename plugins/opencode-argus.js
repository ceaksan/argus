/**
 * Argus plugin for OpenCode.
 *
 * Captures websearch/webfetch tool calls and pipes them to `argus capture`.
 * Install: copy or symlink into your OpenCode plugin directory.
 */

import { spawn } from "node:child_process";

const ASSISTANT = "opencode";
const CAPTURED_TOOLS = new Set(["websearch", "webfetch"]);

function pipeToArgus(phase, payload) {
  return new Promise((resolve) => {
    const child = spawn("argus", ["capture", phase, "--assistant", ASSISTANT], {
      stdio: ["pipe", "ignore", "ignore"],
      detached: false,
    });
    child.on("error", () => resolve());
    child.on("exit", () => resolve());
    try {
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    } catch {
      resolve();
    }
  });
}

export const ArgusPlugin = async (ctx) => {
  return {
    "tool.execute.before": async (input, output) => {
      if (!CAPTURED_TOOLS.has(input.tool)) return;
      const payload = {
        tool: input.tool,
        sessionID: input.sessionID ?? "",
        callID: input.callID ?? "",
        messageID: input.messageID ?? "",
        args: output?.args ?? {},
      };
      await pipeToArgus("pre", payload);
    },
    "tool.execute.after": async (input, output) => {
      if (!CAPTURED_TOOLS.has(input.tool)) return;
      const payload = {
        tool: input.tool,
        sessionID: input.sessionID ?? "",
        callID: input.callID ?? "",
        messageID: input.messageID ?? "",
        args: output?.args ?? {},
        output: output?.output ?? output?.result ?? null,
      };
      await pipeToArgus("post", payload);
    },
  };
};

export default ArgusPlugin;
