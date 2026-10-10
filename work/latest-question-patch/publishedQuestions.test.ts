import esophagealPublishedQuestionSet from './published/esophageal-pass.json'
import gastricPublishedQuestionSet from './published/gastric-pass100.json'
import ros1PublishedQuestionSet from './published/ros1-lung-pass.json'
import { buildPublishedQuestions } from './publishedQuestions'

describe('ROS1 published questions', () => {
  it('maps the approved five-question JSON without changing answers', () => {
    const questions = buildPublishedQuestions(
      ros1PublishedQuestionSet,
      'lung-ros1',
    )

    expect(questions).toHaveLength(5)
    expect(questions.map((question) => question.id)).toEqual([
      'lung-ros1-q1',
      'lung-ros1-q2',
      'lung-ros1-q3',
      'lung-ros1-q4',
      'lung-ros1-q5',
    ])

    questions.forEach((question, index) => {
      const published = ros1PublishedQuestionSet.questions[index]
      expect(question.prompt).toBe(published.question)
      expect(question.options).toEqual(published.options)
      expect(question.correctIndex).toBe(published.answer)
      expect(question.options[question.correctIndex]).toBe(
        published.answer_text,
      )
      expect(question.explanation).toBe(published.explain)
      expect(question.takeaways).toEqual([published.keyPoint])
    })

    expect(questions.map((question) => question.domain)).toEqual([
      '治疗决策',
      '耐药管理',
      '耐药管理',
      '耐药管理',
      '耐药管理',
    ])
  })

  it('preserves formal-guideline source labels', () => {
    const questions = buildPublishedQuestions(
      ros1PublishedQuestionSet,
      'lung-ros1',
    )

    expect(questions[0].evidence).toBe(
      'CSCO · 中国临床肿瘤学会（CSCO）非小细胞肺癌诊疗指南 2026 · 2026',
    )
    expect(questions[3].evidence).toBe(
      'CACA · 肺癌 · 2024',
    )
  })
})

describe('esophageal published questions', () => {
  it('maps the approved five-question JSON without changing answers', () => {
    const questions = buildPublishedQuestions(
      esophagealPublishedQuestionSet,
      'esophageal-vaccine',
    )

    expect(questions).toHaveLength(5)
    expect(questions.map((question) => question.id)).toEqual([
      'esophageal-vaccine-q1',
      'esophageal-vaccine-q2',
      'esophageal-vaccine-q3',
      'esophageal-vaccine-q4',
      'esophageal-vaccine-q5',
    ])

    questions.forEach((question, index) => {
      const published = esophagealPublishedQuestionSet.questions[index]
      expect(question.prompt).toBe(published.question)
      expect(question.options).toEqual(published.options)
      expect(question.correctIndex).toBe(published.answer)
      expect(question.options[question.correctIndex]).toBe(
        published.answer_text,
      )
      expect(question.explanation).toBe(published.explain)
      expect(question.takeaways).toEqual([published.keyPoint])
    })
  })

  it('preserves formal-guideline source labels', () => {
    const questions = buildPublishedQuestions(
      esophagealPublishedQuestionSet,
      'esophageal-vaccine',
    )

    expect(questions[0].evidence).toBe(
      'CACA · 食管癌整合诊治指南（第二版） · 2024',
    )
    expect(questions[3].evidence).toBe(
      'CSCO · 中国临床肿瘤学会（CSCO）食管癌诊疗指南 2026 · 2026',
    )
  })
})

describe('gastric published questions', () => {
  it('maps the approved five-question JSON without changing answers', () => {
    const questions = buildPublishedQuestions(
      gastricPublishedQuestionSet,
      'gastric-her2',
    )

    expect(questions).toHaveLength(5)
    expect(questions.map((question) => question.id)).toEqual([
      'gastric-her2-q1',
      'gastric-her2-q2',
      'gastric-her2-q3',
      'gastric-her2-q4',
      'gastric-her2-q5',
    ])

    questions.forEach((question, index) => {
      const published = gastricPublishedQuestionSet.questions[index]
      expect(question.prompt).toBe(published.question)
      expect(question.options).toEqual(published.options)
      expect(question.correctIndex).toBe(published.answer)
      expect(question.options[question.correctIndex]).toBe(
        published.answer_text,
      )
      expect(question.explanation).toBe(published.explain)
      expect(question.takeaways).toEqual([published.keyPoint])
    })
  })

  it('preserves formal-guideline source labels', () => {
    const questions = buildPublishedQuestions(
      gastricPublishedQuestionSet,
      'gastric-her2',
    )

    expect(questions[0].evidence).toBe(
      'CSCO · 中国临床肿瘤学会（CSCO）胃癌诊疗指南 2026 · 2026',
    )
    expect(questions[3].evidence).toBe(
      'SITC · Society for Immunotherapy of Cancer (SITC) clinical practice guideline on immune checkpoint inhibitor-related adverse events · 2021',
    )
  })
})
