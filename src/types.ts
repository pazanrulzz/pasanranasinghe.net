export interface ChallengePoint {
  title: string
  text: string
}

export interface CustomBlock {
  id: string
  type: 'banner' | 'text' | 'collage'
  label: string
  lead: string
  paragraphs: string[]
  image: string
  /** Collage only: screenshots shown in the animated collage. */
  images: string[]
  /** Banner only: show at the image's own height instead of the fixed 16:9 frame. */
  compact: boolean
}

export interface Project {
  slug: string
  title: string
  heading: string
  client: string
  stage: string
  industry: string
  timeline: string
  quote: string
  author: string
  authorRole: string
  clientLogo: string
  authorPhoto: string
  aboutLead: string
  about: string[]
  challengeLead: string
  challengeIntro: string
  challengePoints: ChallengePoint[]
  brandingLead: string
  branding: string[]
  coverImage: string
  banners: string[]
  order: string[]
  custom: CustomBlock[]
  tags: string[]
  category: string
  colorFrom: string
  colorTo: string
  caption: string
  dark: boolean
}

export type ProjectInput = Omit<Project, 'slug'>

export const emptyProject: ProjectInput = {
  title: '',
  heading: '',
  client: '',
  stage: '',
  industry: '',
  timeline: '',
  quote: '',
  author: '',
  authorRole: '',
  clientLogo: '',
  authorPhoto: '',
  aboutLead: '',
  about: [],
  challengeLead: '',
  challengeIntro: '',
  challengePoints: [],
  brandingLead: '',
  branding: [],
  coverImage: '',
  banners: ['', '', '', '', '', '', '', ''],
  order: [],
  custom: [],
  tags: [],
  category: '',
  colorFrom: '#9ec2f0',
  colorTo: '#e7b98c',
  caption: '',
  dark: false,
}

export const gradientOf = (p: Pick<Project, 'colorFrom' | 'colorTo'>) =>
  `linear-gradient(135deg, ${p.colorFrom}, ${p.colorTo})`

// Reorderable sections of a case study page, top to bottom. Everything above
// them (heading, details, testimonial) is fixed.
export const BANNER_COUNT = 8
export const DEFAULT_ORDER = [
  'banner-0',
  'about',
  'banner-1',
  'banner-2',
  'challenge',
  'banner-3',
  'branding',
  'banner-4',
  'banner-5',
  'banner-6',
  'banner-7',
]

/** Keeps known ids only, removes duplicates and appends anything missing. */
export function normalizeOrder(order?: string[], custom: CustomBlock[] = []): string[] {
  const known = [...DEFAULT_ORDER, ...custom.map((c) => c.id)]
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of [...(order ?? []), ...known]) {
    if (known.includes(id) && !seen.has(id)) {
      seen.add(id)
      result.push(id)
    }
  }
  return result
}
