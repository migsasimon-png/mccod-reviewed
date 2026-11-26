import layouts from "./layouts.json";
import { applySkipEffects } from "./skipLogic";

const mccodFields = () =>
  (layouts as any).mccod.flatMap((s: any) => s.groups.flatMap((g: any) => g.fields)) as {
    de: string;
    widget?: string;
  }[];

test("MCCOD full name is built from surname, given name and other name", () => {
  const values = { Q7VM7swIWb6: "Okello", QmcOqkcNTip: "Mary", tuGPnGHWqQn: "Ann" };
  const patch = applySkipEffects({ Q7VM7swIWb6: "Okello" }, values, {}, "mccod");
  expect(patch.ZYKmQ9GPOaF).toBe("Mary Ann Okello");
});

test("MCCOD name is captured as three parts, not one free-text field", () => {
  const des = mccodFields().map((f) => f.de);
  expect(des).toEqual(expect.arrayContaining(["Q7VM7swIWb6", "QmcOqkcNTip", "tuGPnGHWqQn"]));
  expect(des).not.toContain("ZYKmQ9GPOaF");
});

test("MCCOD date, tick-box and Yes/No widgets are declared on the layout", () => {
  const widgets = Object.fromEntries(mccodFields().filter((f) => f.widget).map((f) => [f.de, f.widget]));
  expect(widgets.roxn33dtLLx).toBe("yesNoCheck");
  expect(widgets.RbrUuKFSqkZ).toBe("date");
  expect(widgets.j5TIQx3gHyF).toBe("date");
  expect(widgets.U18Tnfz9EKd).toBe("date");
  expect(widgets.FhHPxY16vet).toBe("checkbox");
  expect(widgets.u9tYUv6AM51).toBe("checkbox");
  expect(widgets.Kz29xNOBjsJ).toBe("checkbox");
  expect(widgets.AZSlwlRAFig).toBe("yesNo");
});
