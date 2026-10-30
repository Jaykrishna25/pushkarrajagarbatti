/**
 * Every business-specific word on the site lives here.
 *
 * RULE: nothing in this file may state a fact about Pushkar Raj Agarbatti
 * (founding year, origin, ingredients, process, certifications, contact
 * details, policies) until the brand has supplied and verified it. Fields that
 * are still `null` are hidden by the UI, never filled with invented values.
 * Search for `TODO(brand)` to find everything that still needs real input.
 */

export type Link = {label: string; href: string};

export type Policy = {
  id: 'shipping' | 'returns' | 'privacy' | 'terms';
  label: string;
  /** Plain text of the published policy. null = not supplied yet. */
  body: string | null;
};

export const brand = {
  name: 'Pushkar Raj Agarbatti',
  shortName: 'Pushkar Raj',
  descriptor: 'Agarbatti',

  /**
   * TODO(brand): drop the original logo at public/brand/logo.svg (or .png)
   * and set the path here. While null, a typographic placeholder is shown.
   */
  logo: null as null | {src: string; alt: string; width: number; height: number},

  /** Campaign line used as creative direction — NOT an approved slogan. */
  tagline: 'Where Fragrance Meets Divinity.',

  /** One-line description for the footer. Neutral until the brand supplies its own. */
  description: 'Incense and fragrance from Pushkar Raj Agarbatti.',

  /**
   * Shown wherever sample data appears. Remove (set to null) once the real
   * catalogue, prices and imagery are in.
   */
  previewNotice:
    'Preview build — product names, prices, stock and packaging shown here are placeholders awaiting the official catalogue.' as
      | string
      | null,

  /** TODO(brand): fill with verified details. null fields are hidden. */
  contact: {
    email: null as string | null,
    phone: null as string | null,
    whatsapp: null as string | null, // digits only, with country code, e.g. 91XXXXXXXXXX
    address: null as string | null,
    hours: null as string | null,
  },

  /** TODO(brand): official accounts only. */
  social: [] as Link[],

  policies: [
    {id: 'shipping', label: 'Shipping policy', body: null},
    {id: 'returns', label: 'Returns & refunds', body: null},
    {id: 'privacy', label: 'Privacy policy', body: null},
    {id: 'terms', label: 'Terms & conditions', body: null},
  ] as Policy[],

  /** Legal entity name for the copyright line, once confirmed. */
  legalName: null as string | null,
};

export const nav: Link[] = [
  {label: 'Home', href: '#top'},
  {label: 'Our Story', href: '#story'},
  {label: 'Fragrances', href: '#fragrances'},
  {label: 'Our Craft', href: '#craft'},
  {label: 'Shop', href: '#shop'},
  {label: 'Contact', href: '#contact'},
];

export const hero = {
  eyebrow: 'An experience beyond fragrance',
  intro: 'Every fragrance tells a sacred story.',
  prompt: 'Scroll to enter the world of fragrance',
  headline: brand.tagline,
  /** Phase-3 message. Emotional, not factual. */
  message: 'A thread of smoke, a moment of stillness — and the room becomes a sanctuary.',
};

export const story = {
  eyebrow: 'Our Story',
  heading: 'More Than a Fragrance. A Feeling.',
  /**
   * TODO(brand): replace with the verified brand story. This placeholder
   * speaks only about what fragrance does — it makes no claim about the
   * company's history, founders or manufacturing.
   */
  paragraphs: [
    'A lit stick of agarbatti marks a beginning — of a prayer, of a morning, of an evening at home with the people who matter.',
    'Fragrance carries memory. A single breath can bring back a courtyard, a festival, a quiet room at dawn. That is the feeling every Pushkar Raj fragrance is chosen to hold.',
  ],
  pullQuote: 'Light it. Breathe. Arrive.',
  placeholder: true,
};

export const journey = {
  eyebrow: 'The Fragrance Journey',
  heading: 'Four moods. One ritual.',
  body: 'Move through the collection. Each fragrance has its own light, its own texture, its own hour of the day.',
};

export const craft = {
  eyebrow: 'Our Craft',
  /** Shown in sequence as the macro shot pulls back. No product-attribute claims. */
  beats: [
    {title: 'Look closer.', body: 'The ember wakes. A single line of smoke begins to climb.'},
    {title: 'Detail, held in light.', body: 'Every fold of the pack, every curl of smoke, framed with care.'},
    {title: 'The whole ritual.', body: 'Pack, holder and flame — ready for the moment you choose.'},
  ],
};

export const trust = {
  eyebrow: 'Good to know',
  heading: 'Clear information, before you order.',
  usage: {
    title: 'Using incense safely',
    /** General incense safety guidance — not a product claim. */
    points: [
      'Place the stick in a heat-resistant holder on a stable surface.',
      'Light the tip, let it flame briefly, then gently blow it out to a glowing ember.',
      'Never leave burning incense unattended; keep it away from children, pets, curtains and paper.',
      'Use in a ventilated room.',
    ],
  },
};

export const closing = {
  heading: 'Bring Home the Art of Fragrance.',
  body: 'Choose a fragrance for your mornings, your prayers and your quiet evenings.',
  cta: 'Explore the Collection',
};
