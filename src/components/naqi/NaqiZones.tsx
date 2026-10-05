import { Container, Section, SectionHead } from "./primitives";

/**
 * Where we work (§4 §06).
 *
 * The list is the panel's own service areas, not a written one. A website that
 * names a city the business does not serve costs a booking and a complaint;
 * one that omits a city it does serve costs the booking quietly, which is
 * worse because nobody finds out.
 *
 * Zones only, without the area chips the reference draws under each city: the
 * panel models one level, and inventing a second would mean writing the
 * neighbourhoods into the page by hand.
 */
export function NaqiZones({
  index,
  label,
  title,
  intro,
  zones,
}: {
  index: string;
  label: string;
  title: string;
  intro?: string;
  zones: { id?: string; name?: string }[];
}) {
  const named = zones.filter((zone) => zone.name);

  if (named.length === 0) return null;

  return (
    <Section id="zones" className="bg-paper">
      <Container>
        <SectionHead index={index} label={label} title={title} intro={intro} />

        <ul className="flex flex-wrap gap-3">
          {named.map((zone, i) => (
            <li key={zone.id ?? `${zone.name}-${i}`}>
              <span className="inline-flex items-center rounded-full border border-line-strong bg-surface px-4 py-2.5 text-[14px] text-ink">
                {zone.name}
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
