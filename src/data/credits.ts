import credits from './photo-credits.json'

export interface PhotoCredit {
  author: string
  authorUrl: string
  page: string
}

const all = credits as Record<string, PhotoCredit>

export const creditFor = (photo: string): PhotoCredit | undefined => all[photo]

export const creditLine = (photo: string) => {
  const c = all[photo]
  return c ? `Photo: ${c.author} / Unsplash` : ''
}

export const allCredits = all
