type MetadataReader = (url: string) => Promise<any>;

/** Tracker expects the combination UID, while the form selects a category option UID. */
export async function resolveEventAttributeOptionCombo(
  read: MetadataReader,
  program: string,
  nationality: string | undefined
): Promise<string | undefined> {
  const metadata = await read(`/api/programs/${program}.json?fields=categoryCombo[id,name]`);
  const combo = metadata?.categoryCombo;
  if (!combo?.id || typeof combo.name !== "string") {
    throw new Error("Could not read the program's DHIS2 category combination.");
  }
  if (combo.name.toLowerCase() === "default") return undefined;
  if (!nationality) throw new Error("Select a nationality before saving.");

  const result = await read(
    `/api/categoryOptionCombos.json?paging=false&fields=id,categoryOptions[id]&filter=categoryCombo.id:eq:${combo.id}`
  );
  const matches = (result?.categoryOptionCombos || []).filter(
    (optionCombo: { id: string; categoryOptions?: { id: string }[] }) =>
      optionCombo.id && optionCombo.categoryOptions?.length === 1 &&
      optionCombo.categoryOptions[0].id === nationality
  );
  if (matches.length !== 1) {
    throw new Error(`The selected nationality has no unique option combination in the program's "${combo.name}" category combination. Check the program's DHIS2 category configuration.`);
  }
  return matches[0].id;
}
