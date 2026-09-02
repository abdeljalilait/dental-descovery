import type { City } from "./types";

export const cities: City[] = [
  {
    slug: "tanger",
    name: "Tanger",
    nameAr: "طنجة",
    region: { fr: "Tanger-Tétouan-Al Hoceïma", ar: "طنجة - تطوان - الحسيمة" },
    lat: 35.7595,
    lng: -5.834,
    populationNote: { fr: "plus d'un million d'habitants", ar: "أكثر من مليون نسمة" },
    seoIntro: {
      fr: "Tanger concentre un large éventail de cabinets dentaires, du centre-ville aux nouveaux quartiers de Tanger City. Comparez les cliniques par quartier, spécialité et avis avant de prendre rendez-vous.",
      ar: "تضم طنجة تشكيلة واسعة من عيادات الأسنان، من وسط المدينة إلى الأحياء الجديدة. قارن العيادات حسب الحي والتخصص والتقييمات قبل حجز موعدك.",
    },
    featured: true,
  },
  {
    slug: "casablanca",
    name: "Casablanca",
    nameAr: "الدار البيضاء",
    region: { fr: "Casablanca-Settat", ar: "الدار البيضاء - سطات" },
    lat: 33.5731,
    lng: -7.5898,
    populationNote: { fr: "la plus grande ville du Maroc", ar: "أكبر مدينة في المغرب" },
    seoIntro: {
      fr: "Casablanca offre le plus grand choix de cabinets dentaires du Maroc : Maârif, Gauthier, Californie, Ain Diab... Trouvez le praticien adapté à votre budget et à votre traitement.",
      ar: "تقدم الدار البيضاء أكبر تشكيلة من عيادات الأسنان في المغرب: المعاريف، غوتييه، كاليفورنيا، عين الذياب... جد الطبيب المناسب لميزانيتك وعلاجك.",
    },
    featured: true,
  },
  {
    slug: "rabat",
    name: "Rabat",
    nameAr: "الرباط",
    region: { fr: "Rabat-Salé-Kénitra", ar: "الرباط - سلا - القنيطرة" },
    lat: 34.0209,
    lng: -6.8416,
    populationNote: { fr: "la capitale du Royaume", ar: "عاصمة المملكة" },
    seoIntro: {
      fr: "À Rabat, d'Agdal à Souissi en passant par le centre-ville, les cabinets dentaires de la capitale couvrent toutes les spécialités : implantologie, orthodontie, esthétique dentaire.",
      ar: "في الرباط، من أكدال إلى السويسي مروراً بوسط المدينة، تغطي عيادات الأسنان في العاصمة جميع التخصصات: زراعة الأسنان، تقويم الأسنان، تجميل الأسنان.",
    },
    featured: true,
  },
  {
    slug: "marrakech",
    name: "Marrakech",
    nameAr: "مراكش",
    region: { fr: "Marrakech-Safi", ar: "مراكش - آسفي" },
    lat: 31.6295,
    lng: -7.9811,
    populationNote: { fr: "la ville ocre", ar: "المدينة الحمراء" },
    seoIntro: {
      fr: "Marrakech, très prisée des patients internationaux, regroupe des cliniques dentaires modernes à Guéliz, Hivernage et dans la médina. Implants, facettes et sourire hollywoodien au programme.",
      ar: "مراكش، المدينة المفضلة للمرضى الدوليين، تجمع عيادات أسنان حديثة في جيليز والحي الشتوي والمدينة القديمة. زراعة الأسنان والقشور وابتسامة هوليوود في البرنامج.",
    },
    featured: true,
  },
  {
    slug: "fes",
    name: "Fès",
    nameAr: "فاس",
    region: { fr: "Fès-Meknès", ar: "فاس - مكناس" },
    lat: 34.0331,
    lng: -5.0003,
    populationNote: { fr: "capitale spirituelle du Royaume", ar: "العاصمة الروحية للمملكة" },
    seoIntro: {
      fr: "À Fès, les cabinets dentaires se concentrent autour de la ville nouvelle et des principaux axes. Orthodontie, soins conservateurs et prothèses dentaires y sont bien représentés.",
      ar: "في فاس، تتركز عيادات الأسنان حول المدينة الجديدة والمحاور الرئيسية. تقويم الأسنان والعلاجات الترميمية وأطقم الأسنان متوفرة بكثرة.",
    },
    featured: true,
  },
  {
    slug: "agadir",
    name: "Agadir",
    nameAr: "أكادير",
    region: { fr: "Souss-Massa", ar: "سوس - ماسة" },
    lat: 30.4278,
    lng: -9.5981,
    populationNote: { fr: "première station balnéaire du Maroc", ar: "أول منتجع سياحي في المغرب" },
    seoIntro: {
      fr: "À Agadir, entre Founty et le centre-ville, les cliniques dentaires accueillent autant les résidents que les visiteurs : blanchiment, implants et soins esthétiques au bord de l'Atlantique.",
      ar: "في أكادير، بين فونتي ووسط المدينة، تستقبل عيادات الأسنان المقيمين والزوار على حد سواء: تبييض وزراعة وعلاجات تجميلية على ضفاف الأطلسي.",
    },
    featured: true,
  },
  {
    slug: "oujda",
    name: "Oujda",
    nameAr: "وجدة",
    region: { fr: "Oriental", ar: "الشرق" },
    lat: 34.6814,
    lng: -1.9084,
    populationNote: { fr: "métropole de l'Oriental", ar: "حاضرة الشرق" },
    seoIntro: {
      fr: "Les cabinets dentaires d'Oujda couvrent l'ensemble de la région de l'Oriental : soins généraux, orthodontie et implantologie, avec des tarifs souvent plus accessibles.",
      ar: "تغطي عيادات الأسنان في وجدة منطقة الشرق بأكملها: علاجات عامة وتقويم وزراعة أسنان، بأسعار في الغالب أكثر ملاءمة.",
    },
    featured: false,
  },
  {
    slug: "kenitra",
    name: "Kénitra",
    nameAr: "القنيطرة",
    region: { fr: "Rabat-Salé-Kénitra", ar: "الرباط - سلا - القنيطرة" },
    lat: 34.261,
    lng: -6.5802,
    populationNote: { fr: "carrefour entre Rabat et le nord", ar: "ملتقى بين الرباط والشمال" },
    seoIntro: {
      fr: "À Kénitra, les cabinets dentaires du centre et des nouveaux quartiers prennent en charge toute la famille : soins, orthodontie enfant et esthétique dentaire.",
      ar: "في القنيطرة، تتكفل عيادات الأسنان في المركز والأحياء الجديدة بالعائلة بأكملها: علاجات وتقويم أسنان الأطفال وتجميل الأسنان.",
    },
    featured: false,
  },
  {
    slug: "tetouan",
    name: "Tétouan",
    nameAr: "تطوان",
    region: { fr: "Tanger-Tétouan-Al Hoceïma", ar: "طنجة - تطوان - الحسيمة" },
    lat: 35.5785,
    lng: -5.3684,
    populationNote: { fr: "la colombe blanche", ar: "الحمامة البيضاء" },
    seoIntro: {
      fr: "À Tétouan, les praticiens dentaires de la médina et de la ville nouvelle proposent soins conservateurs, prothèses et orthodontie, à 40 minutes de Tanger.",
      ar: "في تطوان، يقدم أطباء الأسنان في المدينة القديمة والمدينة الجديدة علاجات ترميمية وأطقم وتقويم أسنان، على بعد 40 دقيقة من طنجة.",
    },
    featured: false,
  },
  {
    slug: "safi",
    name: "Safi",
    nameAr: "آسفي",
    region: { fr: "Marrakech-Safi", ar: "مراكش - آسفي" },
    lat: 32.2994,
    lng: -9.2372,
    populationNote: { fr: "capitale de la céramique", ar: "عاصمة الفخار" },
    seoIntro: {
      fr: "Les cabinets dentaires de Safi couvrent les soins essentiels : consultations, détartrage, soins conservateurs et prothèses, pour toute la région.",
      ar: "تغطي عيادات الأسنان في آسفي العلاجات الأساسية: استشارات وتنظيف وعلاجات ترميمية وأطقم أسنان، لكل المنطقة.",
    },
    featured: false,
  },
];

export function getCity(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug);
}

export function cityDisplayName(city: City, locale: string): string {
  return locale === "ar" ? city.nameAr : city.name;
}
