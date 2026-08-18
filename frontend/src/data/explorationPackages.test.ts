import { describe, it, expect } from "vitest";
import {
  getPackages,
  getPackageBySlug,
  validatePackage,
  validateAllPackages,
  getEntityDisplayName,
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
      "china_v1:tech-zaopi",
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
    // Baseline was 4 when M72 shipped; Wave2-#143 added 5 more packages
    // (persian/greek/hellenistic/egypt/early_christianity) -> 10 total.
    expect(getPackages().length).toBe(10);
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

describe("M73 Phase2-A entity display name localization (labels.zh)", () => {
  it("zh locale shows Chinese labels for roman/silk/india entities", () => {
    expect(getEntityDisplayName("roman_empire:civ-roman", "zh")).toBe("罗马文明");
    expect(getEntityDisplayName("roman_empire:person-augustus", "zh")).toBe("奥古斯都");
    expect(getEntityDisplayName("silk_road:silk_road", "zh")).toBe("丝绸之路");
    expect(getEntityDisplayName("ancient_india:civ-maurya", "zh")).toBe("孔雀王朝");
    expect(getEntityDisplayName("ancient_india:religion-buddhism", "zh")).toBe("佛教");
  });

  it("en locale is unchanged (labels.en wins)", () => {
    expect(getEntityDisplayName("roman_empire:civ-roman", "en")).toBe("Roman Civilization");
    expect(getEntityDisplayName("silk_road:han_dynasty", "en")).toBe("Han Dynasty");
    expect(getEntityDisplayName("ancient_india:person-ashoka", "en")).toBe("Ashoka the Great");
  });

  it("china package regression: zh labels still win, name fallback intact", () => {
    expect(getEntityDisplayName("china_v1:idea-keju", "zh")).toBe("科举制度");
    // entity without a zh label (defensive) falls back to data-level name
    expect(getEntityDisplayName("roman_empire:event-empire-fall", "ja")).toBe("Fall of the Western Roman Empire");
  });

  it("all 42 entities across the 3 datasets carry labels.en AND labels.zh (bi-lingual parity)", () => {
    for (const gid of [
      "roman_empire:event-roman-empire-established", "roman_empire:civ-roman",
      "roman_empire:loc-rome", "roman_empire:tp-27bc", "roman_empire:roman_egypt",
      "roman_empire:civ-byzantine", "roman_empire:religion-christianity", "roman_empire:tp-republic",
      "roman_empire:person-constantine", "roman_empire:person-julius-caesar",
      "roman_empire:loc-constantinople", "roman_empire:event-edict-milan",
      "roman_empire:event-republic-end", "roman_empire:event-pax-romana",
      "roman_empire:event-empire-fall", "silk_road:silk_road", "silk_road:han_dynasty",
      "silk_road:person-zhang-qian", "china_v1:loc-changan", "china_v1:tech-zaopi",
      "silk_road:event-silk-road-opened", "silk_road:tech-silk", "silk_road:loc-samarkand",
      "silk_road:loc-kashgar", "silk_road:person-ban-chao", "silk_road:tech-glass",
      "silk_road:idea-chinese-language", "ancient_india:civ-maurya", "ancient_india:person-chandragupta",
      "ancient_india:person-ashoka", "ancient_india:loc-pataliputra", "ancient_india:religion-buddhism",
      "ancient_india:person-siddhartha", "ancient_india:loc-indus-valley", "ancient_india:event-kalinga-war",
      "ancient_india:idea-dharma", "ancient_india:tp-maurya", "ancient_india:tp-guupta",
      "ancient_india:person-kalidasa", "ancient_india:tech-zero", "ancient_india:person-aryabhata",
    ]) {
      const zh = getEntityDisplayName(gid, "zh");
      const en = getEntityDisplayName(gid, "en");
      expect(zh).not.toBe(en); // zh must actually be Chinese, not the English name
      expect(zh).not.toBe(gid);
      expect(/[\u4e00-\u9fa5]/.test(zh)).toBe(true);
    }
  });
});
