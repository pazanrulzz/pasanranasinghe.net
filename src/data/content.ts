// All editable copy lives here. Swap in your own details.
export const site = {
  name: 'pasan',
  phone: '+94 77 000 0000',
  bookingUrl: '#contact',
  headline: 'All-in-one Design Studio for Startups',
  subheadline: 'Direction, product thinking, design and motion in one place.',
}

export const nav = {
  services: ['Branding', 'Web Design', 'Product Design'],
  resources: ['Blog', 'Guides', 'Templates'],
}

export type Category = 'Branding' | 'Web Design' | 'Product Design'
export const categories: Category[] = ['Branding', 'Web Design', 'Product Design']

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
  tags: string[]
  category: Category
  gradient: string
  caption: string
  dark?: boolean
}

export const projects: Project[] = [
  {
    slug: 'gaming-platform-brand',
    title: 'Gaming Platform Brand',
    heading: 'Building a Flexible Brand System for a Gaming Platform Across Digital and Physical Space.',
    client: 'Orbitly',
    stage: 'Seed',
    industry: 'Web3',
    timeline: '3 months',
    quote: 'The team nailed the vibe we were going for, with a lot more polish than we expected.',
    author: 'Alex Morgan',
    authorRole: 'Founder & CEO, Orbitly',
    tags: ['Web3', 'Branding'],
    category: 'Branding',
    gradient: 'from-[#9ec2f0] to-[#e7b98c]',
    caption: 'A new world awaits.',
  },
  {
    slug: 'payments-landing-page',
    title: 'Payments Landing Page',
    heading: 'Designing a Landing Page That Makes Global Payments Feel Instant.',
    client: 'Kitepay',
    stage: 'Series A',
    industry: 'Fintech',
    timeline: '6 weeks',
    quote: 'Our conversion rate jumped almost immediately after the new site went live.',
    author: 'Sam Rivera',
    authorRole: 'Head of Growth, Kitepay',
    tags: ['Fintech', 'Web Design'],
    category: 'Web Design',
    gradient: 'from-[#2a0f14] to-[#6b1d28]',
    caption: 'Make Global Payments Instant',
    dark: true,
  },
  {
    slug: 'healthcare-ai-website',
    title: 'Healthcare AI Website',
    heading: 'Creating a Warm, Trustworthy Website for an AI-Powered Care Workforce.',
    client: 'Foresight',
    stage: 'Series B',
    industry: 'Healthcare',
    timeline: '2 months',
    quote: 'They made a complex product feel human and approachable from day one.',
    author: 'Jordan Lee',
    authorRole: 'CMO, Foresight',
    tags: ['Healthcare', 'Web Design'],
    category: 'Web Design',
    gradient: 'from-[#cfe0c3] to-[#8fae7e]',
    caption: 'Your AI-powered workforce for outpatient care.',
  },
  {
    slug: 'analytics-dashboard',
    title: 'Analytics Dashboard',
    heading: 'Designing a Dashboard That Turns Session Failures Into Clear Next Steps.',
    client: 'Helix',
    stage: 'Series A',
    industry: 'SaaS',
    timeline: '4 months',
    quote: 'The new product design cut our onboarding questions in half.',
    author: 'Taylor Chen',
    authorRole: 'Product Lead, Helix',
    tags: ['SaaS', 'Product Design'],
    category: 'Product Design',
    gradient: 'from-[#0c0c0e] to-[#26262b]',
    caption: 'Investigate session failures',
    dark: true,
  },
]

// Hero showcase columns (placeholder visuals)
const [gaming, payments, healthcare, analytics] = projects
export const showcaseA = [analytics, healthcare, payments, gaming]
export const showcaseB = [healthcare, gaming, analytics, payments]

export const footer = {
  tagline:
    'Design, product thinking and motion for founders and marketing teams. One partner, one clear process. Ready to start right now!',
  address: ['123 Example Street, Colombo 03,', 'Western Province, Sri Lanka'],
  phone: '+94 77 000 0000',
  email: 'hello@example.com',
  columns: [
    { title: 'Company', links: ['Portfolio', 'About', 'Contact'] },
    { title: 'Resources', links: ['Case Studies', 'Blog', 'Guides'] },
    { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Copyright Policy'] },
  ],
}
