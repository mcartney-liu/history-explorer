import { describe, it, expect } from "vitest";
import {
  getPackages,
  getPackageBySlug,
  validatePackage,
  validateAllPackages,
} from "./explorationPackages";

const china = () => getPackages().find((p) => p.slug === "china-civilization-v1")!;

describe("M69 Exploration Package contract (graph-grounded)", () => {
  it("registry exposes the official China package", () => {
    const pkgs = getPackages();
    expect(pkgs.length).toBeGreaterThanOrEqual(1);
    expect(china()).toBeDefined();
    expect(china().type).toBe("official");
  });

  it("getPackageBySlug resolves the China package", () => {
    expect(getPackageBySlug("china-civilization-v1")?.slug).toBe("china-civilization-v1");
    expect(getPackageBySlug("does-not-exist")).toBeUndefined();
  });

  it("all packages validate against the Knowledge Graph (zero dangling references)", () => {
    const report = validateAllPackages();
    expect(report.ok, report.errors.join("\n")).toBe(true);
  });

  it("china package: type=official; visibility/status reserved but stored", () => {
    const pkg = china();
    expect(pkg.type).toBe("official");
    expect(["public", "private"]).toContain(pkg.visibility);
    expect(["draft", "reviewed", "featured"]).toContain(pkg.status);
  });

  it("china package timeline chain == 唐→宋→元→明→清 (before edges, in order)", () => {
    const before = china()
      .relationship_paths.filter((r) => r.type === "before")
      .map((r) => r.from);
    expect(before).toEqual([
      "china_v1:tp-tang",
      "china_v1:tp-song",
      "china_v1:tp-yuan",
      "china_v1:tp-ming",
    ]);
  });

  it("china package relationship chain == 科举→文官→内阁 (inherited edges)", () => {
    const inherited = china()
      .relationship_paths.filter((r) => r.type === "inherited")
      .map((r) => `${r.from}->${r.to}`);
    expect(inherited).toContain("china_v1:idea-keju->china_v1:idea-wenguan");
    expect(inherited).toContain("china_v1:idea-wenguan->china_v1:idea-neige");
  });

  it("china package source chain references real sources", () => {
    for (const src of china().source_references) {
      expect(src.startsWith("src-cn-")).toBe(true);
    }
  });

  it("recommended_next uses stable ID pointers (no reliance on display text)", () => {
    for (const rec of china().recommended_next_exploration) {
      expect(rec.ref).toMatch(/^(china_v1:[a-z0-9-]+|[a-z0-9-]+)$/);
      expect(rec.kind).toBeDefined();
    }
  });

  it("single-package validation reports no errors", () => {
    const report = validatePackage(china());
    expect(report.ok, report.errors.join("\n")).toBe(true);
  });
});
