"""Rebuild the CDR form layout with the real DHIS2 data element UIDs
(from ChildDeathReview.csv). Structure follows the real DE model:
 - single DEs for symptoms / known conditions / cause of death (not checkbox groups)
 - investigations are Done (BOOLEAN) + Findings (TEXT) pairs
 - fields with no real DE are dropped; DEs missing from the form are added.
Value types are NOT hardcoded — the app loads them from /api/dataElements.
"""
import io, json

PATH = "src/forms/layouts.json"
d = json.load(io.open(PATH, encoding="utf-8"))

def F(de, label, **kw):
    o = {"de": de, "label": label}
    o.update(kw)
    return o

def G(label, fields):
    return {"label": label, "fields": fields}

def S(title, groups):
    return {"title": title, "groups": groups}

# Investigations: (label, doneUID, findingsUID)
INV = [
    ("B/S or mRDT", "qRTPdydasD8", "rM8N5O9U2cJ"),
    ("CBC / Hb", "TiLOqqWZMFC", "Wo5Y36If9KN"),
    ("Urinalysis", "BsbK0Og0Et1", "rLovNSMYQUX"),
    ("Blood culture", "nPwwg6KuS8K", "h68IiMVXpY8"),
    ("CSF analysis", "QeewvymWLUI", "egQ7WouuJ2I"),
    ("X-Ray", "WOUTeWO4N2B", "rU3OQWsuQNg"),
    ("U/S Scan", "wvxA1sftXz6", "hWsEil3PGdm"),
    ("Blood Sugar", "ra1MS089BCO", "PPGUwRVze5V"),
    ("Blood Chemistry (LFTs, RFTs)", "rm6Vi9rW7sJ", "sgREYy06ifA"),
    ("Others", "wjY44Ck5Q5z", "WGpDDBmMIHR"),
]

inv_fields = []
for name, done, res in INV:
    inv_fields.append(F(done, f"{name} — Done?"))
    inv_fields.append(F(res, f"{name} — Results"))

# Modifiable (avoidable) factors — all BOOLEAN yes/no
MF = [
    ("gKNePs0u0k9", "Delay to seeking Health Care"),
    ("UXLAuJwpbRH", "Delay to reach the health facility"),
    ("iXET9Kwxh0C", "Refusal of treatment or admission"),
    ("H2Tlbe7jP0S", "Use of alternative medication (e.g. herbal)"),
    ("mdUhn7Jbc2K", "Refusal of transfer to higher facility"),
    ("gOAC0Nw8Erz", "Lack of family support / child neglect / violence"),
    ("uraBW0ek60A", "Lack of transport from home to health facility"),
    ("THcFHKwsciD", "Lack of transport between facilities"),
    ("S1i6bceCDu6", "Lack of resuscitation equipment"),
    ("ueadJuyrlRf", "Lack of blood, blood products and supplies"),
    ("OVils10fxy1", "Lack of appropriate medicines / supplies"),
    ("Dy8ND6HuZjL", "Misdiagnosis"),
    ("dX7talxQzr9", "Inappropriate intervention / treatment / doses given"),
    ("uCSQK5z4yt9", "Inadequate numbers of staff"),
    ("aJ5HMCLsHYr", "Absence of critical human resource"),
    ("RzEDajSvfxr", "Staff lack of skill / expertise"),
    ("E9wgWyLMSoG", "Staff professional misconduct"),
    ("SD9xsA0pZaK", "Others (specify)"),
]

# Preserve the ICD-11 certified section already appended to CDR.
icd_section = None
for s in d["cdr"]:
    if "ICD-11" in s["title"]:
        icd_section = s
        break

cdr = [
    S("Case", [G(None, [
        F("ZKBE8Xm9DJG", "Ministry of Health National Case Number"),
        F("r53yF5bi6px", "Date of Review"),
    ])]),
    S("SECTION ONE: Identification", [
        G("Identification of the Child", [
            F("GTI7EqoQokL", "Initials of Child Who Died"),
            F("CdceEuqRSwT", "Age — days (only if under 1 month)"),
            F("Hq6GGFTlHHj", "Sex"),
            F("FA5JmqKlrUT", "Residence — Village"),
            F("m2N3Ea9gdz6", "Residence — Parish"),
            F("Q6LIN4M0CU2", "Residence — Sub county"),
            F("xv0FATnFVms", "Residence — District / City"),
            F("N4M7AB37cP9", "Next of Kin — Relationship"),
            F("vY1rgZCGd2r", "Next of Kin — Age (years)"),
            F("FbYqtKaiFa6", "Next of Kin — Level of Education"),
            F("Tvg3nZyTLeU", "Next of Kin — Occupation"),
        ]),
    ]),
    S("SECTION TWO: Circumstances Surrounding the Death", [
        G(None, [
            F("mfR5fhnOQTA", "Date of Death"),
            F("IGjo7hyxtxF", "Time of Death (24hrs)"),
            F("VdxRWEF4UPB", "Place of Death"),
            F("gxWri1uDNFM", "If death was in a health facility: time spent before death (days/hrs/min)"),
            F("yNsiNIq5D59", "Was Child Referred?"),
            F("xOyckoyi422", "If yes; referred from?"),
            F("g3yvhO9uFpI", "If referred from a health facility, name of the facility"),
        ]),
    ]),
    S("SECTION THREE: Condition at Admission", [
        G(None, [
            F("FX3mcSuvR3c", "Major signs and symptoms at admission"),
            F("Lt6AEASiVsc", "Major findings on physical examination at admission"),
            F("qFCcNYREZjM", "On admission, was the child screened for malnutrition?"),
            F("hPVCXHCvwrc", "If yes, comment on the nutrition status"),
            F("xPCrY214eXn", "Was the child's immunization status up to date?"),
            F("IUq6H8B59IH", "If no, list the doses the child had missed"),
            F("g2qRXEEQrI7", "Child's HIV status at time of death"),
            F("QUMkGwjclEf", "Diagnosis at admission"),
            F("A5mxXfgcbvg", "Had the child been an inpatient in the past three months?"),
        ]),
    ]),
    S("SECTION FOUR: Maternal Risk Factors (skip if child age < 28 days)", [
        G("Antenatal care", [
            F("tKPEnIA0OAy", "Did the mother attend antenatal care?"),
            F("xbxWKAsmIN0", "If yes, how many times?"),
            F("JXTeTVgMDOB", "Gestational age at first visit"),
            F("DuFUOsHMvjZ", "Known conditions during pregnancy"),
        ]),
        G("Labour and Birth", [
            F("YEXXGHE7a7q", "Weeks of amenorrhea at delivery"),
            F("ugiAlde4VrW", "Birth weight of the baby"),
            F("waxR2t677eo", "Place of delivery"),
            F("TZCPZIB2vWU", "Mode of delivery"),
            F("YK9bfWefUwX", "For GA < 37 WOA: did the mother receive antenatal corticosteroids?"),
            F("kWgqvfLcgPL", "Was there preterm rupture of membranes?"),
            F("g3UtTdCciWW", "If yes, did the mother receive prophylactic antibiotics?"),
        ]),
    ]),
    S("SECTION FIVE: Case Management", [
        G("Key investigations done and findings", inv_fields + [
            F("JDDXYWLRunF", "Was any necessary investigation not available?"),
        ]),
        G("Diagnosis & treatment", [
            F("E1jq9jjk2Hy", "Final diagnosis for the patient"),
            F("uEfectwIVQ9", "Summary of treatment / procedures / interventions prescribed"),
            F("OfoBANMXa2W", "Was the prescribed treatment / procedure received fully?"),
            F("gjtE3eQbY1F", "If not received fully, comment on the gaps"),
            F("YcGZgrQsCDg", "Was the treatment provided as per national guidelines?"),
            F("uvkRiOjbT5v", "If not per guidelines, comment on the gaps"),
            F("KWBvJMz69gN", "Were there any complications from the treatment / procedure?"),
            F("NS5BU8xUaTb", "Were any necessary drugs / supplies not available during care?"),
            F("QwtvsW7nnsq", "Missing drug / supplies"),
            F("GNcZNHZzkQ0", "Reason"),
        ]),
    ]),
    S("SECTION SIX: Final Case Review", [
        G("Cause of Death", [
            F("zmqk9EfIlJL", "Case summary"),
            F("y2pLfOeJSHV", "Cause of death"),
            F("PcaOzeIzsln", "Time interval from onset of condition to death"),
            F("Wi4d8SN2hmd", "Other significant conditions contributing to death"),
        ]),
        G("Modifiable (avoidable) factors", [F(de, lbl) for de, lbl in MF]),
    ]),
    S("SECTION SEVEN: Action Plan", [
        G(None, [
            F("KTsOM19SKne", "Gap(s) identified"),
            F("uIQpaEB4DRt", "Recommended action"),
            F("CBo81R52N6g", "Responsible person"),
            F("YXYZT4v0t0W", "Timeline"),
        ]),
    ]),
]

if icd_section:
    cdr.append(icd_section)

d["cdr"] = cdr
json.dump(d, io.open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# Report unique DE ids used (sanity)
ids = [f["de"] for s in cdr for g in s["groups"] for f in g["fields"]]
print(f"CDR rebuilt: {len(cdr)} sections, {len(ids)} fields, {len(set(ids))} unique.")
dupes = {x for x in ids if ids.count(x) > 1}
print("Duplicate DEs:", dupes or "none")
placeholders = [i for i in ids if i.startswith("CDR_")]
print("Remaining CDR_ placeholders:", placeholders or "none")
