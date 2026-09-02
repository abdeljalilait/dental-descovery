import { Container } from "@/components/ui/container";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cities } from "@/lib/data/cities";
import { clinics } from "@/lib/data/clinics";
import { specialties } from "@/lib/data/specialties";

export function StatsBar({ dict }: { locale?: Locale; dict: Dictionary }) {
  const stats = [
    { value: `${cities.length}+`, label: dict.stats.cities },
    { value: `${clinics.length}+`, label: dict.stats.clinics },
    { value: `${specialties.length}`, label: dict.stats.specialties },
    { value: "100 %", label: dict.stats.free },
  ];

  return (
    <div className="border-b border-border bg-surface">
      <Container>
        <dl className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4 rtl:divide-x-reverse">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 px-2 py-6 text-center">
              <dd className="text-2xl font-extrabold tabular-nums text-primary sm:text-3xl">{stat.value}</dd>
              <dt className="text-xs font-medium text-muted sm:text-sm">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </Container>
    </div>
  );
}
