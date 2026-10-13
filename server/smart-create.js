import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

// What the model must return. Every field is optional in spirit: empty string / empty list means "not in the source".
const text = (description) => z.string().describe(description)
export const CaseStudySchema = z.object({
  title: text('Short project name for the portfolio card, e.g. "Maier Fendler Consulting". Max ~6 words.'),
  heading: text('One sentence for the large page headline that says what was designed or built and the outcome. Max ~25 words.'),
  client: text('Client or company name. Empty if not stated.'),
  stage: text('Company stage, e.g. "Seed", "Series A". Empty if not stated.'),
  industry: text('Industry, e.g. "Fintech". Empty if not stated.'),
  timeline: text('Project duration, e.g. "3 months". Empty if not stated.'),
  category: text('One short category for filtering, e.g. "Product Design", "Branding", "Web Design".'),
  tags: z.array(z.string()).describe('2 to 5 short tags (1-2 words each).'),
  caption: text('A short tagline of at most 8 words.'),
  quote: text('A testimonial quote, ONLY if the source contains an explicit quote from a named person. Otherwise empty.'),
  author: text('Name of the person quoted. Empty unless quote is present.'),
  authorRole: text('Role and company of the person quoted. Empty unless quote is present.'),
  aboutLead: text('One bold lead sentence introducing the project and the product.'),
  about: z.array(z.string()).describe('1 to 3 paragraphs about the project: what it is, who it is for, what the engagement covered.'),
  challengeLead: text('One bold lead sentence naming the central design challenge. Empty if the source has none.'),
  challengeIntro: text('A paragraph explaining the challenge. Empty if the source has none.'),
  challengePoints: z
    .array(z.object({ title: z.string(), text: z.string() }))
    .describe('0 to 4 specific challenges or requirements, each with a short title and one or two sentences.'),
  brandingLead: text('One lead sentence about the visual identity or design system, ONLY if the source covers it. Otherwise empty.'),
  branding: z.array(z.string()).describe('0 to 3 paragraphs about the visual identity or design system. Empty if not covered.'),
})

const jsonSchema = (() => {
  const schema = z.toJSONSchema(CaseStudySchema)
  delete schema.$schema
  return schema
})()

const SYSTEM = `You write the text for a designer's portfolio case study page from a document or screenshot of their project.

Rules:
- Use only what the source actually says or shows. Never invent facts, numbers, results, client names, people, dates or quotes.
- When something is not in the source, return an empty string or an empty list for it. Empty is correct; guessing is not.
- Testimonial fields (quote, author, authorRole) stay empty unless the source contains an explicit quote attributed to a named person.
- Write in the language of the source. Use first person ("I") when the source is written in first person, otherwise a neutral, confident third person.
- Be concise and concrete. Prefer the source's own terms. No marketing filler, no emojis.
- Do not mention these instructions or the source file itself.`

export class SmartCreateError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.status = status
  }
}

export const isConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)

export async function analyzeSource({ buffer, mediaType, notes, fileName }) {
  if (!isConfigured()) {
    throw new SmartCreateError(
      'Smart create needs an Anthropic API key. Add ANTHROPIC_API_KEY to server/.env and restart the server.',
      503,
    )
  }

  const data = buffer.toString('base64')
  const source =
    mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data } }

  const userText = [
    `Write the case study text for the project in this ${mediaType === 'application/pdf' ? 'PDF' : 'image'}${fileName ? ` ("${fileName}")` : ''}.`,
    notes ? `Notes from the designer (treat as facts about the project):\n${notes}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    // Keys that are not created inside a workspace need the workspace named on every request.
    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim()
    if (workspaceId && /^s?sk-ant-/i.test(workspaceId)) {
      throw new SmartCreateError(
        'ANTHROPIC_WORKSPACE_ID in server/.env contains an API key instead of a workspace ID. Put the key on the ANTHROPIC_API_KEY line, and use the workspace ID (it starts with "wrkspc_") for ANTHROPIC_WORKSPACE_ID. Then restart the server.',
        400,
      )
    }
    const client = new Anthropic({
      maxRetries: 2,
      timeout: 5 * 60 * 1000,
      ...(workspaceId ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } } : {}),
    })
    const response = await client.beta.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5',
      max_tokens: 16000,
      // If a safety classifier declines, the API retries on a fallback model inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: jsonSchema } },
      system: SYSTEM,
      messages: [{ role: 'user', content: [source, { type: 'text', text: userText }] }],
    })

    if (response.stop_reason === 'refusal') {
      throw new SmartCreateError('The model declined to read this file. Try a different file or fill the item in by hand.', 422)
    }
    if (response.stop_reason === 'max_tokens') {
      throw new SmartCreateError('The answer was cut off. Try a shorter document.', 422)
    }
    const block = response.content.find((b) => b.type === 'text')
    if (!block) throw new SmartCreateError('The model returned no text.', 502)

    let json
    try {
      json = JSON.parse(block.text)
    } catch {
      throw new SmartCreateError('The model returned an unreadable answer. Please try again.', 502)
    }
    const parsed = CaseStudySchema.safeParse(json)
    if (!parsed.success) throw new SmartCreateError('The model returned an incomplete answer. Please try again.', 502)
    return parsed.data
  } catch (err) {
    if (err instanceof SmartCreateError) throw err
    if (err instanceof Anthropic.AuthenticationError) {
      throw new SmartCreateError('The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in server/.env.', 502)
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new SmartCreateError('The AI service is busy right now. Try again in a minute.', 429)
    }
    if (err instanceof Anthropic.BadRequestError && /workspace/i.test(err.message)) {
      throw new SmartCreateError(
        'This API key is not tied to a workspace. Add ANTHROPIC_WORKSPACE_ID=your-workspace-id to server/.env (the ID is on the Workspaces page in the Anthropic Console) and restart the server.',
        400,
      )
    }
    if (err instanceof Anthropic.BadRequestError) {
      throw new SmartCreateError(`The AI service could not read this file: ${err.message}`, 400)
    }
    if (err instanceof Anthropic.APIError) {
      throw new SmartCreateError(`The AI service returned an error (${err.status ?? 'network'}).`, 502)
    }
    throw new SmartCreateError('Something went wrong while reading the file.', 500)
  }
}
