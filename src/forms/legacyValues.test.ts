import { isTicked, matchOptionCode } from "./legacyValues";

test("tick boxes read legacy true/yes/free-text answers as ticked", () => {
  for (const v of [true, "true", "TRUE", "YES", "Yes", "RTA", "Disease", "sepsis"]) {
    expect(isTicked(v)).toBe(true);
  }
  for (const v of [false, "false", "No", "no", "", "  ", null, undefined]) {
    expect(isTicked(v)).toBe(false);
  }
});

test("coded answers match their option regardless of case or true/false wording", () => {
  const yesNo = [{ code: "Yes", name: "Yes" }, { code: "No", name: "No" }];
  expect(matchOptionCode("YES", yesNo)).toBe("Yes");
  expect(matchOptionCode("true", yesNo)).toBe("Yes");
  expect(matchOptionCode("FALSE", yesNo)).toBe("No");
  expect(matchOptionCode("Yes", yesNo)).toBe("Yes");
  expect(matchOptionCode("15/11/2026", yesNo)).toBe("15/11/2026");
  expect(matchOptionCode("health facility", [{ code: "Health Facility", name: "Health Facility" }])).toBe("Health Facility");
});
