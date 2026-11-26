import moment from "moment";
import { CASE_NUMBER_DE, LINKED_DE } from "../forms/registry";
import {
  DashRecord,
  OuRef,
  breakdownByChild,
  computeKpis,
  filterRecords,
  monthsBetween,
  outermostRoots,
  pathFromAncestors,
  periodRange,
  toRecord,
  topCauses,
  trendByMonth,
} from "./dashboardData";

const NAT: OuRef = { id: "NAT", name: "Uganda", level: 1 };
const REG: OuRef = { id: "REG", name: "Northern", level: 2 };
const D1: OuRef = { id: "D1", name: "Abim", level: 3 };
const D2: OuRef = { id: "D2", name: "Gulu", level: 3 };
const F1: OuRef = { id: "F1", name: "Abim Hospital", level: 5 };

const ev = (id: string, orgUnit: string, occurredAt: string, status: string, dv: Record<string, string> = {}) => ({
  event: id,
  orgUnit,
  occurredAt,
  status,
  updatedAt: occurredAt,
  dataValues: Object.keys(dv).map((dataElement) => ({ dataElement, value: dv[dataElement] })),
});

const rec = (form: any, e: any, path: OuRef[]) => toRecord(form, e, path, moment("2026-11-26"));

describe("dashboard records", () => {
  it("flags maternal and perinatal reviews that still need an ICD-11 certificate", () => {
    const pending = rec("mdr", ev("a", "F1", "2026-03-04T00:00:00.000", "COMPLETED", { [CASE_NUMBER_DE]: "020/A/1" }), [NAT, REG, D1, F1]);
    const linked = rec("pdr", ev("b", "F1", "2026-03-04T00:00:00.000", "COMPLETED", { [LINKED_DE]: "abcdefghijk" }), [NAT, REG, D1, F1]);
    const child = rec("cdr", ev("c", "F1", "2026-03-04T00:00:00.000", "COMPLETED"), [NAT, REG, D1, F1]);
    expect(pending.certified).toBe(false);
    expect(linked.certified).toBe(true);
    expect(child.certified).toBeNull();
    expect(computeKpis([pending, linked, child]).certify).toBe(1);
  });

  it("marks a child draft overdue after seven days from the date of death", () => {
    const late = rec("cdr", ev("c", "F1", "2026-10-01T00:00:00.000", "ACTIVE", { mfR5fhnOQTA: "2026-10-01" }), [NAT, F1]);
    const fresh = rec("cdr", ev("d", "F1", "2026-11-25T00:00:00.000", "ACTIVE", { mfR5fhnOQTA: "2026-11-25" }), [NAT, F1]);
    expect(late.overdue).toBe(true);
    expect(fresh.overdue).toBe(false);
  });

  it("counts a maternal record with a future date as needing correction", () => {
    const bad = rec("mdr", ev("e", "F1", "2026-03-04T00:00:00.000", "COMPLETED", { c5kDr80smH8: "2099-01-01T00:00:00.000" }), [NAT, F1]);
    expect(bad.flags.length).toBeGreaterThan(0);
    expect(computeKpis([bad]).flags).toBe(1);
  });
});

describe("dashboard hierarchy", () => {
  const records: DashRecord[] = [
    rec("mdr", ev("1", "F1", "2026-01-10T00:00:00.000", "COMPLETED"), [NAT, REG, D1, F1]),
    rec("pdr", ev("2", "F1", "2026-02-10T00:00:00.000", "COMPLETED"), [NAT, REG, D1, F1]),
    rec("cdr", ev("3", "D2", "2026-02-12T00:00:00.000", "COMPLETED"), [NAT, REG, D2]),
  ];

  it("breaks records down by the next level and keeps empty units visible", () => {
    const top = breakdownByChild(records, "REG", [{ ...D1 }, { id: "D3", name: "Kitgum", level: 3, leaf: false }]);
    const byId = Object.fromEntries(top.map((r) => [r.id, r]));
    expect(byId.D1.total).toBe(2);
    expect(byId.D1.counts.mdr).toBe(1);
    expect(byId.D1.leaf).toBe(false);
    expect(byId.D2.leaf).toBe(true);
    expect(byId.D3.total).toBe(0);
  });

  it("starts from the first level when no area is chosen", () => {
    const top = breakdownByChild(records, null);
    expect(top).toHaveLength(1);
    expect(top[0].id).toBe("NAT");
    expect(top[0].total).toBe(3);
  });

  it("only returns records inside the chosen area", () => {
    const filters = { forms: ["mdr", "pdr", "cdr", "mccod"] as any, status: "all" as const, search: "" };
    expect(filterRecords(records, filters, "D1")).toHaveLength(2);
    expect(filterRecords(records, filters, "D2")).toHaveLength(1);
    expect(filterRecords(records, { ...filters, month: "2026-02" }, null)).toHaveLength(2);
    expect(filterRecords(records, { ...filters, forms: ["cdr"] as any }, null)).toHaveLength(1);
  });

  it("keeps only the outermost assigned org units", () => {
    const roots = outermostRoots([
      { ...REG, path: "/NAT/REG" },
      { ...D1, path: "/NAT/REG/D1" },
      { ...D2, path: "/NAT/REG/D2" },
    ]);
    expect(roots.map((r) => r.id)).toEqual(["REG"]);
    expect(outermostRoots([{ ...D1, path: "/NAT/REG/D1" }, { ...D2, path: "/NAT/REG/D2" }]).map((r) => r.id)).toEqual(["D1", "D2"]);
  });

  it("cuts a path at the user's own org unit", () => {
    const path = pathFromAncestors(
      {
        id: "F1", displayName: "Abim Hospital", level: 5,
        ancestors: [
          { id: "D1", displayName: "Abim", level: 3 },
          { id: "NAT", displayName: "Uganda", level: 1 },
          { id: "REG", displayName: "Northern", level: 2 },
        ],
      },
      ["REG"]
    );
    expect(path.map((p) => p.id)).toEqual(["REG", "D1", "F1"]);
  });
});

describe("dashboard aggregates", () => {
  it("builds a month axis and per-form counts", () => {
    const months = monthsBetween(moment("2026-01-15"), moment("2026-03-02"));
    expect(months).toEqual(["2026-01", "2026-02", "2026-03"]);
    const records = [
      rec("mdr", ev("1", "F1", "2026-01-10T00:00:00.000", "COMPLETED"), [NAT]),
      rec("mdr", ev("2", "F1", "2026-03-10T00:00:00.000", "COMPLETED"), [NAT]),
    ];
    expect(trendByMonth(records, months, ["mdr"])[0].data).toEqual([1, 0, 1]);
  });

  it("ranks causes case-insensitively", () => {
    const cause = (id: string, text: string) => rec("mccod", ev(id, "F1", "2026-01-10T00:00:00.000", "COMPLETED", { mQVAyOLbga1: text }), [NAT]);
    const top = topCauses([cause("1", "Sepsis"), cause("2", "sepsis"), cause("3", "Malaria")]);
    expect(top[0]).toEqual({ label: "Sepsis", n: 2 });
    expect(top).toHaveLength(2);
  });

  it("resolves period presets", () => {
    const now = moment("2026-11-26");
    expect(periodRange("year", null, now)[0].format("YYYY-MM-DD")).toBe("2026-01-01");
    expect(periodRange("quarter", null, now)[0].format("YYYY-MM-DD")).toBe("2026-09-01");
    expect(periodRange("lastYear", null, now)[1].format("YYYY-MM-DD")).toBe("2025-12-31");
  });
});
