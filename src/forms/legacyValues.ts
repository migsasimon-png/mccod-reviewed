/**
 * Read-side normalisation of answers saved by earlier versions of the MCCOD
 * form. Records are not rewritten in bulk; they are interpreted on load and
 * stored in the current format the next time they are saved.
 */

const TRUE_WORDS = /^(true|yes|y|1)$/i;
const FALSE_WORDS = /^(false|no|n|0)$/i;

/**
 * A tick box answer: "true"/"YES" are ticked, "false"/"No" are not, and any
 * other text (e.g. a disease name typed into a manner-of-death box) means the
 * box was selected.
 */
export const isTicked = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim();
  if (!text) return false;
  return !FALSE_WORDS.test(text);
};

/**
 * Map a stored answer onto the option code it was meant to select, ignoring
 * case ("YES" → "Yes") and treating true/false as Yes/No for Yes/No lists.
 * Returns the value unchanged when nothing matches.
 */
export const matchOptionCode = (
  value: unknown,
  options: { code: string; name: string }[]
): unknown => {
  if (typeof value !== "string" || !value.trim() || !options.length) return value;
  const text = value.trim().toLowerCase();
  const direct = options.find(
    (o) => String(o.code).toLowerCase() === text || String(o.name).trim().toLowerCase() === text
  );
  if (direct) return direct.code;
  const wantsYes = TRUE_WORDS.test(value.trim());
  const wantsNo = FALSE_WORDS.test(value.trim());
  if (wantsYes || wantsNo) {
    const target = wantsYes ? "yes" : "no";
    const yesNo = options.find((o) => String(o.name).trim().toLowerCase() === target);
    if (yesNo) return yesNo.code;
  }
  return value;
};
