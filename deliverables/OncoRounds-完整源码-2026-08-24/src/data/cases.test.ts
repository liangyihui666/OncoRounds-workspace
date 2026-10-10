import { grandRoundCases, publishedGrandRoundCases } from './cases'

describe('grandRoundCases', () => {
  it('contains exactly the three supplied clinical cases', () => {
    expect(grandRoundCases).toHaveLength(3)
    expect(grandRoundCases.map((item) => item.cancerType)).toEqual([
      '肺癌',
      '食管癌',
      '胃癌',
    ])
  })

  it('contains complete teaching content for every case', () => {
    for (const item of grandRoundCases) {
      expect(item.doctor).toBeTruthy()
      expect(item.hospital).toBeTruthy()
      expect(item.summary.length).toBeGreaterThanOrEqual(4)
      expect(item.timeline.length).toBeGreaterThanOrEqual(4)
      expect(item.questions).toHaveLength(5)
      expect(item.source).toMatch(/\.pdf$/)
      expect(item.image).toMatch(/^\.\/assets\/cases\/.+\.png$/)
      expect(item.image).not.toMatch(/^\/assets\//)

      for (const question of item.questions) {
        expect(question.options).toHaveLength(4)
        expect(question.options[question.correctIndex]).toBeTruthy()
        expect(question.explanation.length).toBeGreaterThan(20)
        expect(question.takeaways.length).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('publishes the three independently approved cases', () => {
    expect(publishedGrandRoundCases.map((item) => item.id)).toEqual([
      'lung-ros1',
      'esophageal-vaccine',
      'gastric-her2',
    ])
    for (const item of publishedGrandRoundCases) {
      expect(item.difficulty).toBe('进阶')
      expect(item.questions).toHaveLength(5)
    }
    expect(grandRoundCases.map((item) => item.id)).toEqual([
      'lung-ros1',
      'esophageal-vaccine',
      'gastric-her2',
    ])
    expect(grandRoundCases.find((item) => item.id === 'lung-ros1')?.image).toBe(
      './assets/cases/lung-ros1-home.png',
    )
  })
})
