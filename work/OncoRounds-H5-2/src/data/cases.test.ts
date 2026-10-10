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

      for (const question of item.questions) {
        expect(question.options).toHaveLength(4)
        expect(question.options[question.correctIndex]).toBeTruthy()
        expect(question.explanation.length).toBeGreaterThan(20)
        expect(question.takeaways.length).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('publishes only the independently approved ROS1 case', () => {
    expect(publishedGrandRoundCases.map((item) => item.id)).toEqual([
      'lung-ros1',
    ])
    expect(publishedGrandRoundCases[0].difficulty).toBe('进阶')
    expect(publishedGrandRoundCases[0].questions).toHaveLength(5)
    expect(grandRoundCases.map((item) => item.id)).toEqual([
      'lung-ros1',
      'esophageal-vaccine',
      'gastric-her2',
    ])
  })
})
