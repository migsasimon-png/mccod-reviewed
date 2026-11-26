import {
  fromDhis2DeId,
  isMappedPendingDe,
  PENDING_DE_UIDS,
  toDhis2DeId,
  unmappedPlaceholders,
} from "./pendingDataElements";

test("maps the pasted DHIS2 UIDs for save and load", () => {
  expect(PENDING_DE_UIDS.NEW_mdr_death_place_type).toBe("sng0ADbyiaD");
  expect(toDhis2DeId("NEW_pdr_mother_nin")).toBe("vBw7yUMmNqE");
  expect(fromDhis2DeId("PFX8QLFkHPW")).toBe("NEW_mdr_reviewer_details");
  expect(isMappedPendingDe("NEW_pdr_blood_group")).toBe(true);
});

test("maps every MDR and PDR placeholder that exists on the program stages", () => {
  const mdr = [
    "NEW_mdr_death_place_type",
    "NEW_mdr_delivery_facility_name",
    "NEW_mdr_reviewer_details",
    "NEW_mdr_record_legibility",
  ];
  const pdr = [
    "NEW_pdr_mother_nin",
    "NEW_pdr_multiple_babies_count",
    "NEW_pdr_blood_group",
    "NEW_pdr_rhesus_factor",
    "NEW_pdr_blood_transfusion",
    "NEW_pdr_review_date",
    "NEW_pdr_record_legibility",
    "NEW_pdr_reviewer_details",
    "NEW_pdr_neonatal_admission_time",
  ];
  for (const de of [...mdr, ...pdr]) expect(isMappedPendingDe(de)).toBe(true);
  expect(unmappedPlaceholders("mdr")).toEqual([]);
  expect(unmappedPlaceholders("pdr")).toEqual([]);
});
