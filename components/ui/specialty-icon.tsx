import {
  Anchor,
  Baby,
  Layers,
  Shield,
  Siren,
  Smile,
  Gem,
  Sun,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  anchor: Anchor,
  smile: Smile,
  sparkles: Gem,
  gem: Gem,
  sun: Sun,
  shield: Shield,
  baby: Baby,
  layers: Layers,
  siren: Siren,
};

export function SpecialtyIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Stethoscope;
  return <Icon className={className} strokeWidth={1.6} aria-hidden />;
}
