import json

base = json.load(open("scratch/form_layouts.json", encoding="utf-8"))

# Strip 'raw' to keep the shipped file lean (label + de is enough)
def slim(sections):
    for s in sections:
        for g in s["groups"]:
            for f in g["fields"]:
                f.pop("raw", None)
    return sections

def F(de, label, **kw):
    d = {"de": de, "label": label}
    d.update(kw)
    return d

# ---- Child Death Review (CDR) authored from CDR MARCH 26 VERSION.docx ----
# Placeholder data element ids (CDR_*) — to be remapped to real DHIS2 UIDs.
cdr = [
 {"title": "Case", "groups": [
   {"label": None, "fields": [F("ZKBE8Xm9DJG", "Ministry of Health National Case Number")]}
 ]},
 {"title": "SECTION ONE: Identification", "groups": [
   {"label": "Facility", "fields": [
     F("CDR_ownership", "Ownership", hint="Public / PNFP / PFP"),
     F("CDR_hf_level", "Level of Health Facility", hint="NRH / RRH / GH / HCIV / HCIII / HCII"),
   ]},
   {"label": "Identification of the Child", "fields": [
     F("CDR_child_initials", "Initials of Child Who Died"),
     F("CDR_ipno", "IP No."),
     F("CDR_age_years", "Age (Years)"),
     F("CDR_age_months", "Age (Months)"),
     F("CDR_age_days", "Age (Days, if < 1 month)"),
     F("CDR_sex", "Sex"),
     F("CDR_nationality", "Nationality", hint="Ugandan / Refugee / Foreigner"),
     F("CDR_res_village", "Residence - Village"),
     F("CDR_res_parish", "Residence - Parish"),
     F("CDR_res_subcounty", "Residence - Sub county"),
     F("CDR_res_district", "Residence - District/City"),
     F("CDR_nok_relationship", "Next of Kin - Relationship"),
     F("CDR_nok_age", "Next of Kin - Age (years)"),
     F("CDR_nok_education", "Next of Kin - Level of Education"),
     F("CDR_nok_occupation", "Next of Kin - Occupation"),
   ]},
 ]},
 {"title": "SECTION TWO: Circumstances Surrounding the Death", "groups": [
   {"label": None, "fields": [
     F("CDR_date_death", "Date of Death"),
     F("CDR_time_death", "Time of Death (24hrs)"),
     F("CDR_place_death", "Place of Death", hint="Health Facility / Home / In transit / During Referral"),
     F("CDR_hf_days", "Time in H/F before death (days)"),
     F("CDR_hf_hrs", "Time in H/F before death (hours)"),
     F("CDR_hf_min", "Time in H/F before death (minutes)"),
     F("CDR_referred", "Was Child Referred?"),
     F("CDR_referred_from", "If yes; from?", hint="Health Facility / VHT / TBA / Others"),
     F("CDR_referred_from_other", "If Others (specify)"),
     F("CDR_referral_facility", "If referred from health facility, name of the facility"),
   ]},
 ]},
 {"title": "SECTION THREE: Condition at Admission", "groups": [
   {"label": "Major signs and symptoms at admission (select all that apply)", "fields": [
     F("CDR_sym_fever", "Fever"), F("CDR_sym_cough", "Cough"), F("CDR_sym_dib", "Difficulty in breathing"),
     F("CDR_sym_diarrhea", "Diarrhea"), F("CDR_sym_refusal_feed", "Refusal to feed"), F("CDR_sym_vomiting", "Vomiting"),
     F("CDR_sym_reduced_consciousness", "Reduced level of consciousness"), F("CDR_sym_oedema", "Oedema/body swelling"),
     F("CDR_sym_convulsions", "Convulsions"), F("CDR_sym_injury", "Injury/trauma"), F("CDR_sym_pain", "Pain"),
     F("CDR_sym_abdominal_distention", "Abdominal distention"), F("CDR_sym_other", "Others (specify)"),
   ]},
   {"label": None, "fields": [
     F("CDR_physical_findings", "Major findings on Physical Examination at admission"),
     F("CDR_malnutrition_screened", "On admission was the child screened for malnutrition?"),
     F("CDR_nutrition_status", "If yes, nutrition status", hint="No Malnutrition / MAM / SAM"),
     F("CDR_immunization_uptodate", "Was the child's immunization status up to date?"),
     F("CDR_missed_doses", "If no, list the doses the child had missed"),
     F("CDR_hiv_status", "Child's HIV status at time of death"),
     F("CDR_admission_diagnosis", "Diagnosis at admission"),
     F("CDR_inpatient_3months", "Had the Child been an inpatient in the past three months?"),
   ]},
 ]},
 {"title": "SECTION FOUR: Maternal Risk Factors (skip if child age < 28 days)", "groups": [
   {"label": "ANC", "fields": [
     F("CDR_mother_anc", "Did the mother attend Antenatal care?"),
     F("CDR_mother_anc_times", "If yes, how many times?"),
     F("CDR_ga_first_visit", "Gestational age at first visit"),
   ]},
   {"label": "Known Conditions during pregnancy (tick all applicable)", "fields": [
     F("CDR_preg_aph", "Antepartum Hemorrhage"), F("CDR_preg_htn", "Hypertension"),
     F("CDR_preg_prom", "Pre-labour rupture of membranes"), F("CDR_preg_diabetes", "Diabetes"),
     F("CDR_preg_anemia", "Anemia"), F("CDR_preg_uti", "UTI"), F("CDR_preg_malaria", "Malaria"),
     F("CDR_preg_trauma", "Trauma-accidental"), F("CDR_preg_gbv", "Gender based violence"),
     F("CDR_preg_other", "Others (specify)"),
   ]},
   {"label": "Labour and Birth", "fields": [
     F("CDR_weeks_amenorrhea", "Weeks of amenorrhea at delivery"),
     F("CDR_birth_weight", "Birth Weight of the baby"),
     F("CDR_place_delivery", "Place of delivery", hint="Health facility / Home / TBA / Others"),
     F("CDR_place_delivery_other", "Place of delivery (Others specify)"),
     F("CDR_mode_delivery", "Mode of Delivery", hint="Normal / Caesarean / Vacuum or Forceps"),
     F("CDR_antenatal_corticosteroids", "For GA <37 WOA: Did the mother receive Antenatal Corticosteroids?"),
     F("CDR_pprom", "Was there Preterm Rupture of Membranes?"),
     F("CDR_prophylactic_antibiotics", "If Yes, Did the Mother receive Prophylactic Antibiotics?"),
   ]},
 ]},
 {"title": "SECTION FIVE: Case Management", "groups": [
   {"label": "Key Investigations done and findings (Done Y/N + Results)", "fields": [
     F("CDR_inv_bs_done", "B/S or mRDT - Done"), F("CDR_inv_bs_result", "B/S or mRDT - Results"),
     F("CDR_inv_cbc_done", "CBC/Hb - Done"), F("CDR_inv_cbc_result", "CBC/Hb - Results"),
     F("CDR_inv_urinalysis_done", "Urinalysis - Done"), F("CDR_inv_urinalysis_result", "Urinalysis - Results"),
     F("CDR_inv_bloodculture_done", "Blood culture - Done"), F("CDR_inv_bloodculture_result", "Blood culture - Results"),
     F("CDR_inv_csf_done", "CSF analysis - Done"), F("CDR_inv_csf_result", "CSF analysis - Results"),
     F("CDR_inv_xray_done", "X-Ray - Done"), F("CDR_inv_xray_result", "X-Ray - Results"),
     F("CDR_inv_us_done", "U/S Scan - Done"), F("CDR_inv_us_result", "U/S Scan - Results"),
     F("CDR_inv_bloodsugar_done", "Blood Sugar - Done"), F("CDR_inv_bloodsugar_result", "Blood Sugar - Results"),
     F("CDR_inv_bloodchem_done", "Blood Chemistry (LFTs, RFTs) - Done"), F("CDR_inv_bloodchem_result", "Blood Chemistry - Results"),
     F("CDR_inv_other_done", "Others - Done"), F("CDR_inv_other_result", "Others - Results"),
   ]},
   {"label": None, "fields": [
     F("CDR_inv_unavailable", "Was any necessary investigation not available?"),
     F("CDR_inv_unavailable_specify", "If yes, specify"),
     F("CDR_final_diagnosis", "Final Diagnosis for the patient"),
     F("CDR_treatment_summary", "Summary of treatment/procedures/interventions prescribed"),
     F("CDR_treatment_received_fully", "Was the prescribed treatment/procedure received fully?"),
     F("CDR_treatment_gaps", "If No, comment on the gaps"),
     F("CDR_treatment_guidelines", "Was the treatment provided as per national guidelines?"),
     F("CDR_guidelines_gaps", "If No, comment on the gaps"),
     F("CDR_complications", "Were there any complications from the treatment/procedure?"),
     F("CDR_complications_specify", "If yes, specify"),
     F("CDR_drugs_unavailable", "Were any necessary drugs/supplies not available during care?"),
     F("CDR_drugs_unavailable_specify", "If yes, specify the drug and reason"),
   ]},
 ]},
 {"title": "SECTION SIX: Final Case Review", "groups": [
   {"label": None, "fields": [F("CDR_case_summary", "Case Summary")]},
   {"label": "Cause of Death (Frame A) - complete HMIS FOM100", "fields": [
     F("CDR_cod_a", "(a) Disease/condition directly leading to death", icd=True, codeField="CDR_cod_a_code", uriField="CDR_cod_a_uri"),
     F("CDR_cod_a_interval", "(a) Time interval from onset to death"),
     F("CDR_cod_b", "(b) Due to (or as a consequence of)", icd=True, codeField="CDR_cod_b_code", uriField="CDR_cod_b_uri"),
     F("CDR_cod_b_interval", "(b) Time interval from onset to death"),
     F("CDR_cod_c", "(c) Due to (or as a consequence of)", icd=True, codeField="CDR_cod_c_code", uriField="CDR_cod_c_uri"),
     F("CDR_cod_c_interval", "(c) Time interval from onset to death"),
     F("CDR_cod_d", "(d) Due to (or as a consequence of)", icd=True, codeField="CDR_cod_d_code", uriField="CDR_cod_d_uri"),
     F("CDR_cod_d_interval", "(d) Time interval from onset to death"),
     F("CDR_cod_other", "Other significant conditions contributing to death"),
   ]},
   {"label": "Modifiable Factors (Avoidable Factors - Yes + Specify)", "fields": [
     F("CDR_mf_delay_seek", "Delay to seeking Health Care"),
     F("CDR_mf_delay_reach", "Delay to reach the health facility"),
     F("CDR_mf_refusal", "Refusal of treatment or admission"),
     F("CDR_mf_alt_medication", "Use of alternative medication (e.g. herbal)"),
     F("CDR_mf_refuse_transfer", "Refusal of transfer to higher facility"),
     F("CDR_mf_family_support", "Lack of family support / Child Neglect / violence"),
     F("CDR_mf_transport_home", "Lack of transport from home to health facility"),
     F("CDR_mf_transport_between", "Lack of transport between facilities"),
     F("CDR_mf_resus_equipment", "Lack of resuscitation equipment"),
     F("CDR_mf_blood", "Lack of blood, blood products and supplies"),
     F("CDR_mf_medicines", "Lack of appropriate medicines/supplies"),
     F("CDR_mf_misdiagnosis", "Misdiagnosis"),
     F("CDR_mf_inappropriate", "Inappropriate intervention / treatment / doses given"),
     F("CDR_mf_inadequate_staff", "Inadequate numbers of staff"),
     F("CDR_mf_absent_hr", "Absence of critical human resource"),
     F("CDR_mf_skill", "Staff lack of skill/expertise"),
     F("CDR_mf_misconduct", "Staff professional misconduct"),
     F("CDR_mf_other", "Others (specify)"),
   ]},
 ]},
 {"title": "SECTION SEVEN: Action Plan", "groups": [
   {"label": "Follow-up actions", "fields": [
     F("CDR_ap_gaps", "Gap(s) identified"),
     F("CDR_ap_action", "Recommended action"),
     F("CDR_ap_responsible", "Responsible person"),
     F("CDR_ap_timeline", "Timeline"),
   ]},
   {"label": "Completed by", "fields": [
     F("CDR_completed_name", "Name"),
     F("CDR_completed_tel", "Tel"),
     F("CDR_completed_email", "Email"),
   ]},
 ]},
]

out = {
 "pdr": slim(base["pdr"]),
 "mdr": slim(base["mdr"]),
 "cdr": cdr,
}
json.dump(out, open("src/forms/layouts.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
tot = {k: sum(len(g["fields"]) for s in v for g in s["groups"]) for k,v in out.items()}
print("written src/forms/layouts.json", tot)
