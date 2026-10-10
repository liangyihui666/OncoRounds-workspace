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
      '耐药管理',
      '耐药管理',
      '治疗决策',
      '分子诊断',
      '耐药管理',
    ])
  })

  it('keeps guideline and case-fact source labels distinct', () => {
    const questions = buildPublishedQuestions(
      ros1PublishedQuestionSet,
      'lung-ros1',
    )

    expect(questions[0].evidence).toBe(
      'CSCO · 中国临床肿瘤学会（CSCO）非小细胞肺癌诊疗指南 2026 · 2026',
    )
    expect(questions[3].evidence).toBe(
      'ROS1融合阳性晚期肺腺癌全程精准治疗病例',
    )
  })
})
