import { describe, expect, it } from "vitest";
import { isKnownDistrict, isKnownProvince, listDistricts, listProvinces } from "./index";

describe("Il and ilçe lists", () => {
  it("lists all 81 provinces in Turkish alphabetical order", () => {
    const provinces = listProvinces();

    expect(provinces).toHaveLength(81);
    expect(provinces[0]).toBe("Adana");
    expect(provinces.indexOf("Çanakkale")).toBeGreaterThan(provinces.indexOf("Burdur"));
    expect(provinces.indexOf("Çanakkale")).toBeLessThan(provinces.indexOf("Denizli"));
    expect(provinces.at(-1)).toBe("Zonguldak");
  });

  it("covers the 973 districts of Türkiye", () => {
    const total = listProvinces().reduce((sum, province) => sum + listDistricts(province).length, 0);

    expect(total).toBe(973);
  });

  it("lists the districts of a province", () => {
    expect(listDistricts("İstanbul")).toContain("Kadıköy");
    expect(listDistricts("Bayburt")).toEqual(["Aydıntepe", "Demirözü", "Merkez"]);
  });

  it("returns no districts for an unknown province", () => {
    expect(listDistricts("Atlantis")).toEqual([]);
  });

  it("accepts a district only under its own province", () => {
    expect(isKnownDistrict("İzmir", "Urla")).toBe(true);
    expect(isKnownDistrict("Ankara", "Urla")).toBe(false);
    expect(isKnownDistrict("Atlantis", "Merkez")).toBe(false);
  });

  it("knows a province by its exact Turkish name", () => {
    expect(isKnownProvince("Çanakkale")).toBe(true);
    expect(isKnownProvince("Canakkale")).toBe(false);
  });
});
