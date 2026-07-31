import { describe, it, expect } from "vitest";
import {
  getPackages,
  getPackageBySlug,
  validatePackage,
  validateAllPackages,
} from "./explorationPackages";

const china = () => getPackages().find((p) => p.slug === "china-civilization-v1")!;
const silkRoad = () => getPackages().find((p) => p.slug === "silk-road-exploration")!;
const romanEmpire = () => getPackages().find((p) => p.slug === "roman-empire-exploration")!;
const india = () => getPackages().find((p) => p.slug === "india-classical-civilization")!;

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

  it("M73 contract reservation: owner/version/sourcePackage optional, undefined, zero validation impact", () => {
    const pkg = china();
    // Reserved-only fields must be absent today (no UI / no logic depends on them).
    expect(pkg.owner).toBeUndefined();
    expect(pkg.version).toBeUndefined();
    expect(pkg.sourcePackage).toBeUndefined();
    // validatePackage must stay green without them (no new required checks).
    const report = validatePackage(pkg);
    expect(report.ok, report.errors.join("\n")).toBe(true);
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

describe("M70 cross-dataset packages (silk-road / roman-empire)", () => {
  it("registry exposes silk-road and roman-empire packages (official)", () => {
    expect(silkRoad().type).toBe("official");
    expect(romanEmpire().type).toBe("official");
  });

  it("silk-road package resolves cross-dataset edges (ancient_india -> silk_road, silk_road -> roman_empire)", () => {
    const paths = silkRoad().relationship_paths;
    expect(paths).toContainEqual(
      expect.objectContaining({
        from: "ancient_india:religion-buddhism",
        to: "silk_road:silk_road",
        type: "spread",
        evidence: ["ec-023"],
      }),
    );
    expect(paths).toContainEqual(
      expect.objectContaining({
        from: "silk_road:silk_road",
        to: "roman_empire:civ-roman",
        type: "traded_with",
      }),
    );
    const report = validatePackage(silkRoad());
    expect(report.ok, report.errors.join("\n")).toBe(true);
  });

  it("roman-empire package validates with evidence-bound paths (ec-rom-*)", () => {
    const report = validatePackage(romanEmpire());
    expect(report.ok, report.errors.join("\n")).toBe(true);
    const withEvidence = romanEmpire().relationship_paths.filter((p) => p.evidence?.length);
    expect(withEvidence.length).toBeGreaterThanOrEqual(8);
    expect(romanEmpire().relationship_paths).toContainEqual(
      expect.objectContaining({
        from: "roman_empire:civ-roman",
        to: "silk_road:silk_road",
        type: "traded_with",
        evidence: ["ec-rom-027"],
      }),
    );
  });

  it("timeline slices and recommended entity refs resolve across datasets", () => {
    expect(silkRoad().timeline_slices.map((s) => s.entity)).toEqual([
      "silk_road:person-zhang-qian",
      "silk_road:event-silk-road-opened",
      "silk_road:tech-paper",
    ]);
    expect(romanEmpire().timeline_slices.map((s) => s.entity)).toEqual([
      "roman_empire:tp-republic",
      "roman_empire:tp-27bc",
      "roman_empire:event-roman-empire-established",
      "roman_empire:event-empire-fall",
    ]);
    for (const pkg of [silkRoad(), romanEmpire()]) {
      const report = validatePackage(pkg);
      expect(report.ok, report.errors.join("\n")).toBe(true);
    }
  });
});

describe("M72 india-classical-civilization (cross-civilization focus)", () => {
  it("registry exposes the India package (official, 4th package)", () => {
    expect(india().type).toBe("official");
    expect(getPackages().length).toBe(4);
  });

  it("india package resolves cross-civilization edges (buddhism -> silk road/han, maurya <-> persia)", () => {
    const paths = india().relationship_paths;
    expect(paths).toContainEqual(
      expect.objectContaining({
        from: "ancient_india:religion-buddhism",
        to: "silk_road:silk_road",
        type: "spread",
        evidence: ["ec-023"],
      }),
    );
    expect(paths).toContainEqual(
      expect.objectContaining({
        from: "ancient_india:religion-buddhism",
        to: "silk_road:han_dynasty",
        type: "spread",
      }),
    );
    expect(paths).toContainEqual(
      expect.objectContaining({
        from: "ancient_india:civ-maurya",
        to: "persian_empire:civ-persian",
        type: "contemporary_with",
      }),
    );
    const report = validatePackage(india());
    expect(report.ok, report.errors.join("\n")).toBe(true);
  });

  it("india package sources include primary (ashoka edicts) + academic + reference tiers", () => {
    expect(india().source_references).toContain("src-ashoka-edicts");
    expect(india().source_references).toContain("src-thapar-early-india");
    expect(india().source_references).toContain("src-silk-road-archives");
  });

  it("no recommended_next points to a 'planned' package anymore (closed loop)", () => {
    const slugs = new Set(getPackages().map((p) => p.slug));
    for (const pkg of getPackages()) {
      for (const rec of pkg.recommended_next_exploration) {
        if (rec.kind === "package") {
          expect(slugs.has(rec.ref), `${pkg.slug} -> ${rec.ref} must be a real package`).toBe(true);
          expect(rec.label.zh).not.toContain("规划中");
        }
      }
    }
  });
});
