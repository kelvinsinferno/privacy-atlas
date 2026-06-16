import type { FieldContext, FieldMeta } from "./field-types";

const lc = (s: string): string => (s || "").toLowerCase();

/**
 * Classify a form field into a privacy-relevant context using METADATA ONLY.
 * Never reads the field's value. Precision over recall: returns null when unsure.
 */
export function classifyField(meta: FieldMeta): FieldContext | null {
  if (meta.disabled || meta.readOnly || meta.hidden) return null;
  const type = lc(meta.type);
  if (type === "password" || type === "search" || type === "hidden") return null;

  // 1) autocomplete token (gold standard — last token after section-*/shipping/billing prefixes)
  const acToken = lc(meta.autocomplete).split(/\s+/).filter(Boolean).pop() ?? "";
  if (acToken === "email") return "email";
  if (acToken.startsWith("cc-")) return "payment";
  if (acToken === "tel" || acToken.startsWith("tel-")) return "phone";
  if (
    acToken === "street-address" ||
    acToken === "address-line1" ||
    acToken === "address-line2" ||
    acToken === "postal-code"
  ) return "address";

  // 2) input type fallback
  if (type === "email") return "email";
  if (type === "tel") return "phone";

  // 3) conservative keyword heuristics on name/id/placeholder/aria-label (email checked first,
  //    so "email address" -> email, never address)
  const hay = [meta.name, meta.id, meta.placeholder, meta.ariaLabel].map(lc).join(" ");
  if (/(^|[^a-z])e-?mail([^a-z]|$)/.test(hay)) return "email";
  if (/card.?number|cardnum|cc-?num|creditcard|card_?no/.test(hay)) return "payment";
  if (/(^|[^a-z])(phone|mobile|telephone|tel)([^a-z]|$)/.test(hay)) return "phone";
  // street and zip need word boundaries (avoid "streetwear"/"gzip"); zip also matches "zipcode".
  if (
    /(^|[^a-z])street([^a-z]|$)/.test(hay) ||
    /shipping.?address|postal.?code|postcode/.test(hay) ||
    /(^|[^a-z])zip(code|[^a-z]|$)/.test(hay)
  ) return "address";

  return null;
}
