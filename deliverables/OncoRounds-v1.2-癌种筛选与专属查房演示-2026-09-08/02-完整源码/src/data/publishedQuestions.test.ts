import esophagealPublishedQuestionSet from './published/esophageal-pass.json'
import gastricPublishedQuestionSet from './published/gastric-pass100.json'
import ros1PublishedQuestionSet from './published/ros1-lung-pass.json'
import { buildPublishedQuestions } from './publishedQuestions'
import type { PublishedQuestionSet } from './types'

function createV11QuestionSet() {
  const questionSet = JSON.parse(
    JSON.stringify(ros1PublishedQuestionSet),
  ) as PublishedQuestionSet
  questionSet.schema_version = '1.1'
  questionSet.questions[3].guidelineRef.evidence_type = '病例+临床推理'
  questionSet.questions[4].guidelineRef.evidence_type = '病例+临床推理'
  return questionSet
}

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

  it('exposes source, year and one evidence sentence without internal locators', () => {
    const questions = buildPublishedQuestions(
      ros1PublishedQuestionSet,
      'lung-ros1',
    )

    expect(questions[0].evidence).toEqual({
      sourceTitle:
        ros1PublishedQuestionSet.questions[0].guidelineRef.source_title,
      sourceVersion:
        ros1PublishedQuestionSet.questions[0].guidelineRef.source_version,
      evidenceSummary:
        ros1PublishedQuestionSet.questions[0].guidelineRef.evidence_summary,
    })
    expect(JSON.stringify(questions[0])).not.toContain(
      ros1PublishedQuestionSet.questions[0].guidelineRef.doc_id,
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

  it('exposes learner-facing evidence metadata', () => {
    const questions = buildPublishedQuestions(
      esophagealPublishedQuestionSet,
      'esophageal-vaccine',
    )

    expect(questions[0].evidence).toMatchObject({
      sourceTitle:
        esophagealPublishedQuestionSet.questions[0].guidelineRef.source_title,
      sourceVersion:
        esophagealPublishedQuestionSet.questions[0].guidelineRef.source_version,
    })
    expect(questions[0].evidence.evidenceSummary).toBeTruthy()
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

  it('exposes learner-facing evidence metadata', () => {
    const questions = buildPublishedQuestions(
      gastricPublishedQuestionSet,
      'gastric-her2',
    )

    expect(questions[0].evidence).toMatchObject({
      sourceTitle:
        gastricPublishedQuestionSet.questions[0].guidelineRef.source_title,
      sourceVersion:
        gastricPublishedQuestionSet.questions[0].guidelineRef.source_version,
    })
    expect(questions[3].evidence.evidenceSummary).not.toContain(
      'If patients experience severe hyperglycemia',
    )
  })
})

describe('published question schema compatibility', () => {
  it('treats a missing schema version as legacy schema 1.0', () => {
    const questionSet = JSON.parse(
      JSON.stringify(ros1PublishedQuestionSet),
    ) as Record<string, unknown>
    delete questionSet.schema_version

    expect(buildPublishedQuestions(questionSet, 'legacy-no-version')).toHaveLength(5)
  })

  it('accepts schema 1.1 with two hard-evidence and two clinical-reasoning questions', () => {
    const questionSet = createV11QuestionSet()

    expect(buildPublishedQuestions(questionSet, 'v11-case')).toHaveLength(5)
  })

  it('accepts an empty optional source version and omits no evidence conclusion', () => {
    const questionSet = createV11QuestionSet()
    questionSet.questions[3].guidelineRef.source_version = ''

    const questions = buildPublishedQuestions(questionSet, 'v11-no-year')
    expect(questions[3].evidence.sourceVersion).toBe('')
    expect(questions[3].evidence.evidenceSummary).toBeTruthy()
  })

  it('rejects schema 1.1 evidence types and quotas that belong to schema 1.0', () => {
    const questionSet = createV11QuestionSet()
    questionSet.questions[3].guidelineRef.evidence_type = '病例事实'

    expect(() => buildPublishedQuestions(questionSet, 'v11-legacy-type')).toThrow(
      /incompatible with schema 1\.1/,
    )
  })

  it('rejects unsupported schema versions', () => {
    const questionSet = createV11QuestionSet() as unknown as Record<
      string,
      unknown
    >
    questionSet.schema_version = '2.0'

    expect(() => buildPublishedQuestions(questionSet, 'future-case')).toThrow(
      /unsupported schema version/,
    )
  })

  it('rejects a locator used by more than two questions', () => {
    const questionSet = createV11QuestionSet()
    const source = questionSet.questions[0].guidelineRef
    questionSet.questions.slice(1, 3).forEach((question) => {
      question.guidelineRef.doc_id = source.doc_id
      question.guidelineRef.split_index = source.split_index
    })

    expect(() => buildPublishedQuestions(questionSet, 'reused-locator')).toThrow(
      /reuses one locator more than twice/,
    )
  })

  it('requires two uses of one locator to represent distinct decisions', () => {
    const questionSet = createV11QuestionSet()
    const first = questionSet.questions[0]
    const second = questionSet.questions[1]
    second.guidelineRef.doc_id = first.guidelineRef.doc_id
    second.guidelineRef.split_index = first.guidelineRef.split_index
    second.timepoint = first.timepoint

    expect(() => buildPublishedQuestions(questionSet, 'duplicate-decision')).toThrow(
      /without distinct decisions/,
    )
  })
})
