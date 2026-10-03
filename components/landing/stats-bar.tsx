import { Container } from "@/components/ui/container";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getDirectoryStatsDb } from "@/lib/repositories/stats";

export async function StatsBar({ dict }: { locale?: Locale; dict: Dictionary }) {
  const stats = await getDirectoryStatsDb();

  const entries = [
    { value: `${stats.cityCount}+`, label: dict.stats.cities },
    { value: `${stats.clinicCount}+`, label: dict.stats.clinics },
    { value: `${stats.specialtyCount}`, label: dict.stats.specialties },
    { value: "100 %", label: dict.stats.free },
  ];

  return (
    <div className="border-b border-border bg-surface">
      <Container>
        <dl className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4 rtl:divide-x-reverse">
          {entries.map((stat) => (
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
