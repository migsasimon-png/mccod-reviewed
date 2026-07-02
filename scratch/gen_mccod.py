import json

def F(de, label, **kw):
    d = {"de": de, "label": label}; d.update(kw); return d

mccod = [
 {"title": "Case", "groups": [
   {"label": None, "fields": [F("ZKBE8Xm9DJG", "Ministry of Health National Case Number")]}
 ]},
 {"title": "Details of the Deceased", "groups": [
   {"label": None, "fields": [
     F("ZYKmQ9GPOaF", "Full Name"),
     F("MOstDqSY0gO", "NIN"),
     F("e96GB4CXyd3", "Sex"),
     F("roxn33dtLLx", "Date of Birth Known"),
     F("RbrUuKFSqkZ", "Date of Birth"),
     F("q7e7FOXKnOf", "Age (years)"),
     F("n9s5bKgCCVq", "Age in months"),
     F("dsiwvNQLe5n", "Occupation"),
     F("rcpgGFLMfOw", "Religion"),
   ]},
   {"label": "Usual Residence", "fields": [
     F("zwKo51BEayZ", "Village"),
     F("bNpMzyShDCX", "Parish"),
     F("u44XP9fZweA", "Sub-County"),
     F("b70okb06FWa", "County"),
     F("se3wRj1bYPo", "County (MD)"),
     F("t5nTEmlScSt", "District"),
   ]},
 ]},
 {"title": "Death", "groups": [
   {"label": None, "fields": [
     F("xNCSFrgdUgi", "Place of Death"),
     F("i8rrl8YWxLF", "Date and time of Death"),
     F("QDHeWslaEoH", "Referred"),
     F("WqYvFt79TQB", "Referred From?"),
   ]},
 ]},
 {"title": "For women (Maternal)", "groups": [
   {"label": None, "fields": [
     F("zcn7acUB6x1", "For women, was the deceased pregnant?"),
     F("KpfvNQSsWIw", "If yes, at what point in time was deceased pregnant?"),
     F("AJAraEcfH63", "Did the pregnancy contribute to the death?"),
     F("RJhbkjYrODG", "Referred from (level of care)"),
     F("ymyLrfEcYkD", "Parity"),
     F("K5BDPJQk1BP", "Mode of delivery"),
     F("Z41di0TRjIu", "Place of delivery"),
     F("uaxjt0inPNF", "Delivered by skilled attendant"),
   ]},
 ]},
 {"title": "Fetal / Infant Death", "groups": [
   {"label": None, "fields": [
     F("V4rE1tsj5Rb", "Multiple pregnancy"),
     F("ivnHp4M4hFF", "Stillborn?"),
     F("jf9TogeSZpk", "If death within 24h, number of hours survived"),
     F("lQ1Byr04JTx", "Number of completed weeks of pregnancy"),
     F("GFVhltTCG8b", "If perinatal, conditions of mother that affected the fetus/newborn"),
     F("xAWYJtQsg8M", "Birth weight (in grams)"),
     F("DdfDMFW4EJ9", "Age of mother (years)"),
   ]},
 ]},
 {"title": "Cause of Death (Frame A)", "groups": [
   {"label": "(a) Disease or condition directly leading to death", "fields": [
     F("sfpqAeqKeyQ", "Cause of death (a)", icd=True, codeField="zD0E77W4rFs", uriField="k9xdBQzYMXo", next="Ylht9kCLSRW"),
     F("Ylht9kCLSRW", "Time interval — type (a)"),
     F("WkXxkKEJLsg", "Time interval (a)"),
   ]},
   {"label": "(b) Due to (or as a consequence of)", "fields": [
     F("zb7uTuBCPrN", "Cause of death (b)", icd=True, codeField="tuMMQsGtE69", uriField="yftBZ5bSEOb", next="myydnkmLfhp"),
     F("myydnkmLfhp", "Time interval — type (b)"),
     F("fleGy9CvHYh", "Time interval (b)"),
   ]},
   {"label": "(c) Due to (or as a consequence of)", "fields": [
     F("QGFYJK00ES7", "Cause of death (c)", icd=True, codeField="C8n6hBilwsX", uriField="fJUy96o8akn", next="aC64sB86ThG"),
     F("aC64sB86ThG", "Time interval — type (c)"),
     F("hO8No9fHVd2", "Time interval (c)"),
   ]},
   {"label": "(d) Due to (or as a consequence of)", "fields": [
     F("CnPGhOcERFF", "Cause of death (d)", icd=True, codeField="IeS8V8Yf40N", uriField="S53kx50gjQn", next="cmZrrHfTxW3"),
     F("cmZrrHfTxW3", "Time interval — type (d)"),
     F("eCVDO6lt4go", "Time interval (d)"),
   ]},
   {"label": "Underlying cause & other conditions", "fields": [
     F("QTKk2Xt8KDu", "State the underlying cause"),
     F("xeE5TQLvucB", "Other significant conditions contributing to death"),
     F("mI0UjQioE7E", "Other significant condition 2"),
     F("u5ebhwtAmpU", "Other significant condition 3"),
     F("OxJgcwH15L7", "Other significant condition 4"),
     F("Zrn8LD3LoKY", "Other significant condition 5"),
   ]},
   {"label": "WHO DORIS — computed underlying cause of death", "fields": [
     F("tKezaEs8Ez5", "Doris underlying cause (text)"),
     F("LAvyxs29laJ", "Doris underlying cause (code)"),
     F("mQVAyOLbga1", "Final underlying cause (text)"),
     F("n2mScmFMovq", "Final underlying cause (code)"),
   ]},
 ]},
 {"title": "Manner of Death", "groups": [
   {"label": None, "fields": [
     F("FhHPxY16vet", "Manner of death (disease)"),
     F("AZSlwlRAFig", "External cause or poisoning"),
     F("KsGOxFyzIs1", "Assault"),
     F("gNM2Yhypydx", "Accident"),
     F("tYH7drlbNya", "Legal intervention"),
     F("wX3i3gkTG4m", "Intentional self-harm"),
     F("fQWuywOaoN2", "Pending investigation"),
     F("b4yPk98om7e", "Could not be determined"),
     F("xDMX2CJ4Xw3", "War"),
     F("o1hG9vr0peF", "Unknown"),
   ]},
   {"label": "External cause details", "fields": [
     F("U18Tnfz9EKd", "Date of Injury (if external cause or poisoning)"),
     F("DKlOhZJOCrX", "Describe how external cause occurred (specify poisoning agent)"),
     F("kGIDD5xIeLC", "Place of occurrence of the external cause"),
     F("mDez8j7furx", "If Other place (please specify)"),
   ]},
 ]},
 {"title": "Surgery & Autopsy", "groups": [
   {"label": None, "fields": [
     F("Kk0hmrJPR90", "Was surgery performed within the last 4 weeks?"),
     F("j5TIQx3gHyF", "If yes, date of surgery"),
     F("JhHwdQ337nn", "If yes, reason for surgery (disease or condition)"),
     F("jY3K6Bv4o9Q", "Was an autopsy requested?"),
     F("UfG52s4YcUt", "If yes, were the findings used in the certification?"),
   ]},
 ]},
 {"title": "Certifier & Declaration", "groups": [
   {"label": None, "fields": [
     F("u9tYUv6AM51", "I attended the deceased before death"),
     F("Kz29xNOBjsJ", "I attended the deceased before death (note)"),
     F("ZXZZfzBpu8a", "I examined the body after death"),
     F("cp5xzqVU2Vw", "I conducted the post mortem of the body"),
     F("lu9BiHPxNqH", "Declaration — Other (specify)"),
     F("PaoRZbokFWJ", "Examined By"),
     F("twVlVWM3ffz", "Approval"),
   ]},
 ]},
]

layouts = json.load(open("src/forms/layouts.json", encoding="utf-8"))
layouts["mccod"] = mccod
json.dump(layouts, open("src/forms/layouts.json","w",encoding="utf-8"), indent=1, ensure_ascii=False)
fc = sum(len(g["fields"]) for s in mccod for g in s["groups"])
print("mccod sections", len(mccod), "fields", fc, "| total forms:", list(layouts))
