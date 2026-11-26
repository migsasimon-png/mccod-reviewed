import moment from "moment";
import { mustCorrectFlags, validateReviewForm } from "./reviewValidation";

test("blocks future dates and short NIN on maternal review", () => {
  const flags = validateReviewForm("mdr", {
    WzauwhVOwM0: moment().add(2, "days"),
    CupbOInqvJI: "AB12",
  });
  expect(mustCorrectFlags(flags).map((f) => f.message)).toEqual(
    expect.arrayContaining([
      "Date cannot be in the future.",
      "NIN must have 14 characters.",
    ])
  );
});

test("blocks death before delivery and invalid Apgar on perinatal review", () => {
  const flags = validateReviewForm("pdr", {
    RpkIvgOOZJt: "2026-01-10",
    Dq9aH0aZ2wb: "2026-01-08",
    NEW_pdr_apgar_1: 12,
  });
  expect(mustCorrectFlags(flags).map((f) => f.field)).toEqual(
    expect.arrayContaining(["Dq9aH0aZ2wb", "NEW_pdr_apgar_1"])
  );
});
