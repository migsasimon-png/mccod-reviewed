#!/usr/bin/env node
/**
 * DHIS2 metadata needed by the 24 Nov 2026 MCH020 / MCH017 retest fixes.
 *
 * Run it as a DHIS2 SUPERUSER (the integration account cannot edit metadata).
 *
 *   DHIS2_URL=https://hmis.health.go.ug DHIS2_USER=admin DHIS2_PASSWORD=... \
 *     node scripts/apply-retest-metadata.js            # dry run: prints the plan
 *   ... node scripts/apply-retest-metadata.js --apply  # makes the changes
 *
 * A personal access token also works: DHIS2_TOKEN=d2pat_...
 *
 * What it does (safe to run twice; steps already done are skipped):
 *   1. Creates the option set "017-PDR-Level of health facility".
 *   2. Creates a place-of-delivery option set for MCH020 5.7 (the 8 facility
 *      choices plus TBA, Home, On the way) and points 5.7 at it. The shared
 *      "Health Facility Type" set (also used by 4.3) is left untouched.
 *   3. Adds "1-4hrs" and "4-6hrs" to the duration of labour option set.
 *   4. Adds "Others" to the MCH017 "referred from" option set.
 *   5. Creates the 85 new data elements in scripts/retest-data-elements.json
 *      (28 MCH020, 57 MCH017) with the UIDs the app already expects.
 *   6. Attaches the new data elements, and 13 existing MCH017 data elements,
 *      to the MCH020 (YXed7PnLRco) and MCH017 (CGz50G2MY16) program stages.
 *
 * Not done here: make MCH020 "Outcome of pregnancy" (aCzqBYUkfDe) non-compulsory
 * on its stage if you want the app to stop writing "Not Delivered" automatically.
 *
 * NOTE: written against the DHIS2 2.43 metadata API but never run against the
 * live server from the app repository. Run the dry run first and read the plan.
 */
const fs = require("fs");
const path = require("path");

const BASE = (process.env.DHIS2_URL || "").replace(/\/+$/, "");
const APPLY = process.argv.includes("--apply");
if (!BASE) {
  console.error("Set DHIS2_URL (for example https://hmis.health.go.ug).");
  process.exit(1);
}
const AUTH = process.env.DHIS2_TOKEN
  ? `ApiToken ${process.env.DHIS2_TOKEN}`
  : `Basic ${Buffer.from(`${process.env.DHIS2_USER}:${process.env.DHIS2_PASSWORD}`).toString("base64")}`;

const DES = JSON.parse(fs.readFileSync(path.join(__dirname, "retest-data-elements.json"), "utf8"));
const STAGES = { mdr: "YXed7PnLRco", pdr: "CGz50G2MY16" };

/** Existing MCH017 data elements the new contributing-factor table uses. */
const EXISTING_PDR_TO_ATTACH = [
  "RDZmJ4Gmc4L", "Qz8q3XBSjy7", "k2TAhDXqlfd", "gpsCp6L5MHc", "gnGGrkTImYG", "c0AUhrgQFrP",
  "X7IrhmUEdET", "cgYi5jj7r2w", "mwmaHTiegIB", "tcDXmTEHLzk", "hF2ukgby2eY",
  "R3qk5ewfvX3", "UqXEtE3KzHY",
];

const PLACE_OF_DELIVERY_SET = "020-Place of delivery";
const PLACE_OF_DELIVERY_DE = "AqXDMjrPUEE";
const PLACE_EXTRA = ["TBA", "Home", "On the way"];
const LABOUR_DURATION_DE = "NKKunKgeJiD";
const LABOUR_EXTRA = ["1-4hrs", "4-6hrs"];
const REFERRED_FROM_DE = "o03g3QSYR0b";

const log = (...args) => console.log(...args);
const api = async (method, url, body) => {
  const res = await fetch(`${BASE}/api/${url}`, {
    method,
    headers: { Authorization: AUTH, Accept: "application/json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok && res.status !== 409 && !(method === "GET" && res.status === 404)) throw new Error(`${method} ${url} -> ${res.status} ${text.slice(0, 400)}`);
  return { status: res.status, json };
};

let idPool = [];
const newId = async () => {
  if (!idPool.length) idPool = (await api("GET", "system/id?limit=100")).json.codes;
  return idPool.pop();
};

const importMetadata = async (label, payload) => {
  if (!APPLY) { log(`  [dry run] would import ${label}`); return; }
  const { json } = await api("POST", "metadata?importStrategy=CREATE_AND_UPDATE&atomicMode=ALL", payload);
  const report = json.response || json;
  if (report.status !== "OK") {
    console.error(JSON.stringify(report.typeReports || report, null, 1).slice(0, 4000));
    throw new Error(`Import failed: ${label}`);
  }
  log(`  imported ${label}:`, JSON.stringify(report.stats));
};

const optionSetByName = async (name) => {
  const { json } = await api("GET", `optionSets?filter=name:eq:${encodeURIComponent(name)}&fields=id,name,options[id,code,name]`);
  return (json.optionSets || [])[0] || null;
};

const optionSetOf = async (dataElement) => {
  const { json } = await api("GET", `dataElements/${dataElement}?fields=id,optionSet[id,name,options[id,code,name,sortOrder]]`);
  return json.optionSet || null;
};

const makeOptions = async (names) =>
  Promise.all(names.map(async (name, index) => ({ id: await newId(), code: name, name, sortOrder: index + 1 })));

async function main() {
  log(APPLY ? "APPLYING changes" : "DRY RUN (add --apply to make changes)", "against", BASE);
  const me = (await api("GET", "me?fields=username,authorities")).json;
  log("Signed in as", me.username);
  if (APPLY && !(me.authorities || []).some((a) => a === "ALL" || a === "F_DATAELEMENT_PUBLIC_ADD")) {
    throw new Error("This account cannot create data elements. Use a superuser.");
  }

  // --- 1. Level of health facility option set -------------------------------
  const levelDe = DES.find((d) => d.placeholder === "NEW_pdr_facility_level");
  let levelSet = await optionSetByName(levelDe.optionSetNew);
  if (levelSet) log("1. Option set exists:", levelDe.optionSetNew, levelSet.id);
  else {
    const options = await makeOptions(levelDe.options);
    levelSet = { id: await newId(), name: levelDe.optionSetNew, valueType: "TEXT", options: options.map(({ id }) => ({ id })) };
    log("1. Creating option set", levelDe.optionSetNew, `(${options.length} options)`);
    await importMetadata("level of facility option set", { options, optionSets: [levelSet] });
  }

  // --- 2. Place of delivery for MCH020 5.7 -----------------------------------
  const currentPlaceSet = await optionSetOf(PLACE_OF_DELIVERY_DE);
  let placeSet = await optionSetByName(PLACE_OF_DELIVERY_SET);
  if (placeSet) log("2. Option set exists:", PLACE_OF_DELIVERY_SET, placeSet.id);
  else {
    const existing = (currentPlaceSet?.options || []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    // "Other" stays last, after the community choices.
    const facility = existing.filter((o) => !/^other$/i.test(o.code)).map((o) => o.code);
    const tail = existing.filter((o) => /^other$/i.test(o.code)).map((o) => o.code);
    const options = await makeOptions([...facility, ...PLACE_EXTRA, ...tail]);
    placeSet = { id: await newId(), name: PLACE_OF_DELIVERY_SET, valueType: "TEXT", options: options.map(({ id }) => ({ id })) };
    log("2. Creating option set", PLACE_OF_DELIVERY_SET, "->", options.map((o) => o.code).join(", "));
    await importMetadata("place of delivery option set", { options, optionSets: [placeSet] });
  }
  if (currentPlaceSet?.id !== placeSet.id) {
    log("   Pointing", PLACE_OF_DELIVERY_DE, "at", PLACE_OF_DELIVERY_SET);
    const { json: de } = await api("GET", `dataElements/${PLACE_OF_DELIVERY_DE}?fields=:owner`);
    await importMetadata("place of delivery data element", { dataElements: [{ ...de, optionSet: { id: placeSet.id } }] });
  }

  // --- 3. Duration of labour: 1-4hrs and 4-6hrs ------------------------------
  await addOptions("3. Duration of labour", LABOUR_DURATION_DE, LABOUR_EXTRA, (codes) => {
    const at = codes.findIndex((c) => /^1-4hrs\.?\s*4-6hrs$/i.test(c));
    return at >= 0 ? at + 1 : codes.length;
  });

  // --- 4. Referred from: Others ----------------------------------------------
  await addOptions("4. Referred from", REFERRED_FROM_DE, ["Others"], (codes) => codes.length);

  // --- 5. New data elements ---------------------------------------------------
  const setByDe = {};
  const optionSetFor = async (de) => {
    if (de.optionSetNew) return levelSet.id;
    if (de.optionSetFrom) {
      if (!setByDe[de.optionSetFrom]) setByDe[de.optionSetFrom] = (await optionSetOf(de.optionSetFrom))?.id;
      return setByDe[de.optionSetFrom];
    }
    return null;
  };
  const toCreate = [];
  for (const de of DES) {
    const { status } = await api("GET", `dataElements/${de.uid}?fields=id`);
    if (status === 200) continue;
    const optionSetId = await optionSetFor(de);
    if ((de.optionSetFrom || de.optionSetNew) && !optionSetId) throw new Error(`No option set for ${de.placeholder}`);
    toCreate.push({
      id: de.uid,
      name: de.name,
      shortName: `${de.name.slice(0, 40)}${de.uid.slice(0, 4)}`.slice(0, 50),
      valueType: de.valueType,
      domainType: "TRACKER",
      aggregationType: "NONE",
      ...(optionSetId ? { optionSet: { id: optionSetId } } : {}),
    });
  }
  log(`5. Data elements to create: ${toCreate.length} of ${DES.length}`);
  if (toCreate.length) await importMetadata("new data elements", { dataElements: toCreate });

  // --- 6. Attach to the program stages ------------------------------------------
  for (const [form, stageId] of Object.entries(STAGES)) {
    const wanted = DES.filter((d) => d.form === form).map((d) => d.uid);
    if (form === "pdr") wanted.push(...EXISTING_PDR_TO_ATTACH);
    const { json: stage } = await api("GET", `programStages/${stageId}?fields=:owner`);
    const have = new Set((stage.programStageDataElements || []).map((p) => p.dataElement.id));
    const missing = wanted.filter((id) => !have.has(id));
    log(`6. ${form.toUpperCase()} stage ${stageId}: ${missing.length} data elements to attach`);
    if (!missing.length) continue;
    const base = (stage.programStageDataElements || []).length;
    const added = missing.map((id, i) => ({
      id: undefined,
      dataElement: { id },
      programStage: { id: stageId },
      compulsory: false,
      displayInReports: false,
      allowFutureDate: false,
      sortOrder: base + i + 1,
    }));
    const programStageDataElements = [...stage.programStageDataElements, ...added.map(({ id, ...rest }) => rest)];
    await importMetadata(`${form} stage data elements`, { programStages: [{ ...stage, programStageDataElements }] });
  }

  log(APPLY ? "Done. Reload the app and open both forms: the yellow \"cannot be saved yet\" notice should be gone."
            : "Dry run finished. Nothing was changed.");
}

/** Add option codes to the option set behind a data element, keeping order. */
async function addOptions(label, dataElement, codes, position) {
  const set = await optionSetOf(dataElement);
  if (!set) throw new Error(`${dataElement} has no option set`);
  const { json: usage } = await api("GET", `dataElements?filter=optionSet.id:eq:${set.id}&fields=id,name&paging=false`);
  if ((usage.dataElements || []).length > 1) {
    log(`   note: option set "${set.name}" is shared by ${(usage.dataElements || []).length} data elements`);
  }
  const existing = (set.options || []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const have = new Set(existing.map((o) => o.code));
  const missing = codes.filter((c) => !have.has(c));
  if (!missing.length) { log(`${label}: already has ${codes.join(", ")}`); return; }
  const created = await makeOptions(missing);
  const order = existing.map((o) => o.id);
  const at = position(existing.map((o) => o.code));
  order.splice(at, 0, ...created.map((o) => o.id));
  log(`${label}: adding ${missing.join(", ")} to "${set.name}"`);
  await importMetadata(`${label} options`, {
    options: created.map((o) => ({ ...o, sortOrder: undefined })),
    optionSets: [{ id: set.id, name: set.name, valueType: "TEXT", options: order.map((id) => ({ id })) }],
  });
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
