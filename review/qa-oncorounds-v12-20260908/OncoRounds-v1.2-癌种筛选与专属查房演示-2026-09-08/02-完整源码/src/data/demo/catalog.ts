import { publishedGrandRoundCases } from '../cases'
import { adaptDemoCase } from './adapter'
import type { CancerCategory, DemoCase, ExternalCase, ExternalQuestionSet } from './types'
import page0 from './raw/04-肺癌-ALK腺鳞癌.json'
import questions0 from './raw/04-肺癌-ALK腺鳞癌-5题.json'
import page1 from './raw/01-胃癌-免疫相关胆管炎.json'
import questions1 from './raw/01-胃癌-免疫相关胆管炎-5题.json'
import page2 from './raw/02-GEJ腺癌-pCR后复发.json'
import questions2 from './raw/02-GEJ腺癌-pCR后复发-5题.json'
import page3 from './raw/03-食管鳞癌-器官保存与TEN.json'
import questions3 from './raw/03-食管鳞癌-器官保存与TEN-5题.json'
import page4 from './raw/04-乳腺小叶癌-胃肠道与腹膜转移.json'
import questions4 from './raw/04-乳腺小叶癌-胃肠道与腹膜转移-5题.json'
import page5 from './raw/05-炎性乳腺癌-CMT与动态分型.json'
import questions5 from './raw/05-炎性乳腺癌-CMT与动态分型-5题.json'

export const externalDemoPairs = [
  { page: page0 as ExternalCase, questions: questions0 as unknown as ExternalQuestionSet, category: '肺癌' as CancerCategory, cover: './assets/cases/lung-ros1-home.png' },
  { page: page1 as ExternalCase, questions: questions1 as unknown as ExternalQuestionSet, category: '胃癌' as CancerCategory, cover: './assets/cases/gastric-her2.png' },
  { page: page2 as ExternalCase, questions: questions2 as unknown as ExternalQuestionSet, category: 'GEJ腺癌' as CancerCategory, cover: './assets/cases/gej-adenocarcinoma-home.png' },
  { page: page3 as ExternalCase, questions: questions3 as unknown as ExternalQuestionSet, category: '食管癌' as CancerCategory, cover: './assets/cases/esophageal-vaccine.png' },
  { page: page4 as ExternalCase, questions: questions4 as unknown as ExternalQuestionSet, category: '乳腺癌' as CancerCategory, cover: './assets/cases/breast-cancer-home.png' },
  { page: page5 as ExternalCase, questions: questions5 as unknown as ExternalQuestionSet, category: '乳腺癌' as CancerCategory, cover: './assets/cases/breast-cancer-home.png' },
]
const imported = externalDemoPairs.map(({page, questions, category, cover}) => adaptDemoCase(page, questions, category, cover))
const original: DemoCase[] = publishedGrandRoundCases.map(item => ({ ...item, category: item.cancerType, demoOnly: true }))
export const demoCases: DemoCase[] = [original[0], imported[0], original[2], imported[1], imported[4], imported[5], original[1], imported[3], imported[2]]
export function getDemoCase(id: string): DemoCase {
  const item = demoCases.find(item => item.id === id)
  if (!item) throw new Error('未知演示病例：' + id)
  return item
}

