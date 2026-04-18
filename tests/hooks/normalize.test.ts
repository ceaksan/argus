import { describe, it, expect } from "vitest";
import { normalize } from "../../src/hooks/normalize";

describe("normalize", () => {
  describe("Claude Code payload", () => {
    it("normalizes WebSearch pre", () => {
      const raw = {
        session_id: "s1",
        cwd: "/p",
        tool_name: "WebSearch",
        tool_input: { query: "react hooks" },
        tool_use_id: "toolu_1",
      };
      const n = normalize(raw, "pre");
      expect(n).toMatchObject({
        type: "search",
        query: "react hooks",
        toolUseId: "toolu_1",
        sessionId: "s1",
        cwd: "/p",
      });
    });

    it("normalizes WebFetch post with tool_response", () => {
      const raw = {
        session_id: "s1",
        cwd: "/p",
        tool_name: "WebFetch",
        tool_input: { url: "https://x.com", prompt: "extract" },
        tool_use_id: "toolu_2",
        tool_response: { content: "hello" },
      };
      const n = normalize(raw, "post");
      expect(n?.type).toBe("fetch");
      expect(n?.query).toBe("https://x.com");
      expect(n?.results).toEqual({ content: "hello" });
    });
  });

  describe("Kimi CLI payload", () => {
    it("normalizes SearchWeb pre with tool_call_id", () => {
      const raw = {
        hook_event_name: "PreToolUse",
        session_id: "ks1",
        cwd: "/p",
        tool_name: "SearchWeb",
        tool_input: { query: "zero waste", limit: 5 },
        tool_call_id: "call_k1",
      };
      const n = normalize(raw, "pre");
      expect(n).toMatchObject({
        type: "search",
        query: "zero waste",
        toolUseId: "call_k1",
      });
    });

    it("normalizes FetchURL post with tool_output", () => {
      const raw = {
        hook_event_name: "PostToolUse",
        session_id: "ks1",
        cwd: "/p",
        tool_name: "FetchURL",
        tool_input: { url: "https://y.com" },
        tool_call_id: "call_k2",
        tool_output: "markdown content",
      };
      const n = normalize(raw, "post");
      expect(n?.type).toBe("fetch");
      expect(n?.query).toBe("https://y.com");
      expect(n?.results).toBe("markdown content");
    });
  });

  describe("rejection", () => {
    it("ignores unrelated tools", () => {
      const raw = { tool_name: "Bash", tool_input: { command: "ls" } };
      expect(normalize(raw, "pre")).toBeNull();
    });

    it("ignores empty query", () => {
      const raw = { tool_name: "WebSearch", tool_input: {} };
      expect(normalize(raw, "pre")).toBeNull();
    });

    it("ignores empty url for fetch", () => {
      const raw = { tool_name: "FetchURL", tool_input: {} };
      expect(normalize(raw, "pre")).toBeNull();
    });
  });
});
