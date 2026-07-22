import type { ResolvedAttribute } from "@/types/api";
import type { Locale } from "@/i18n/locales";

function displayValue(attribute: ResolvedAttribute, locale: Locale): string {
  if (attribute.reference_value) {
    return attribute.reference_value.translations[locale]?.name ?? attribute.reference_value.code;
  }
  if (attribute.value_string !== null) return attribute.value_string;
  if (attribute.value_number !== null) {
    return attribute.unit_symbol ? `${attribute.value_number} ${attribute.unit_symbol}` : attribute.value_number;
  }
  if (attribute.value_boolean !== null) return attribute.value_boolean ? "✓" : "—";
  if (attribute.value_date !== null) return attribute.value_date;
  return "—";
}

export function SpecsTable({ attributes, locale }: { attributes: ResolvedAttribute[]; locale: Locale }) {
  if (attributes.length === 0) return null;

  return (
    <table className="w-full text-sm">
      <tbody>
        {attributes.map((attribute) => (
          <tr key={attribute.attribute_definition_id} className="border-b border-box last:border-0 dark:border-box-dark">
            <td className="py-2 pr-4 text-slate-500">{attribute.translations[locale]?.name ?? attribute.name}</td>
            <td className="py-2 font-medium">{displayValue(attribute, locale)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
