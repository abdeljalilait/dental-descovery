import type { Specialty } from "./types";

export const specialties: Specialty[] = [
  {
    slug: "implantologie",
    name: { fr: "Implantologie", ar: "زراعة الأسنان" },
    description: {
      fr: "Remplacement de dents manquantes par des implants en titane, avec couronne sur mesure.",
      ar: "تعويض الأسنان المفقودة بزرعات من التيتانيوم مع تاج مصنوع حسب الطلب.",
    },
    icon: "anchor",
  },
  {
    slug: "orthodontie",
    name: { fr: "Orthodontie", ar: "تقويم الأسنان" },
    description: {
      fr: "Alignement des dents pour enfants et adultes : bagues, aligneurs invisibles, contention.",
      ar: "تسوية الأسنان للأطفال والكبار: التقويم الثابت، التقويم الشفاف، التثبيت.",
    },
    icon: "smile",
  },
  {
    slug: "facettes",
    name: { fr: "Facettes & esthétique", ar: "القشور والتجميل" },
    description: {
      fr: "Facettes en céramique, sourire hollywoodien et corrections esthétiques du sourire.",
      ar: "قشور خزفية وابتسامة هوليوود وتصحيحات تجميلية للابتسامة.",
    },
    icon: "sparkles",
  },
  {
    slug: "blanchiment",
    name: { fr: "Blanchiment", ar: "تبييض الأسنان" },
    description: {
      fr: "Éclaircissement dentaire professionnel en cabinet, résultats visibles dès la première séance.",
      ar: "تبييض أسنان احترافي في العيادة، نتائج ملحوظة من الجلسة الأولى.",
    },
    icon: "sun",
  },
  {
    slug: "parodontologie",
    name: { fr: "Parodontologie", ar: "علاج اللثة" },
    description: {
      fr: "Traitement des gencives : détartrage approfondi, curetage et suivi des maladies parodontales.",
      ar: "علاج اللثة: تنظيف عميق وكحت ومتابعة أمراض اللثة.",
    },
    icon: "shield",
  },
  {
    slug: "pedodontie",
    name: { fr: "Dentisterie pédiatrique", ar: "أسنان الأطفال" },
    description: {
      fr: "Soins dentaires adaptés aux enfants : prévention, scellement, fluor et première consultation.",
      ar: "علاجات أسنان مخصصة للأطفال: الوقاية والسد ووضع الفلوراير والزيارة الأولى.",
    },
    icon: "baby",
  },
  {
    slug: "protheses-dentaires",
    name: { fr: "Prothèses dentaires", ar: "أطقم الأسنان" },
    description: {
      fr: "Couronnes, bridges et prothèses amovibles en zircone ou céramique, réalisées sur mesure.",
      ar: "تيجان وجسور وأطقم متحركة من الزركونيا أو الخزف، مصنوعة حسب الطلب.",
    },
    icon: "layers",
  },
  {
    slug: "urgence-dentaire",
    name: { fr: "Urgences dentaires", ar: "طوارئ الأسنان" },
    description: {
      fr: "Douleur aiguë, dent cassée, abcès : trouvez un cabinet qui reçoit les urgences rapidement.",
      ar: "ألم حاد، سن مكسور، خراج: جد عيادة تستقبل الحالات الطارئة بسرعة.",
    },
    icon: "siren",
  },
];

export function getSpecialty(slug: string): Specialty | undefined {
  return specialties.find((s) => s.slug === slug);
}
