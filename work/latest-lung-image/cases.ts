import type { GrandRoundCase } from './types'
import esophagealPublishedQuestionSet from './published/esophageal-pass.json'
import gastricPublishedQuestionSet from './published/gastric-pass100.json'
import ros1PublishedQuestionSet from './published/ros1-lung-pass.json'
import { buildPublishedQuestions } from './publishedQuestions'

export const grandRoundCases: GrandRoundCase[] = [
  {
    id: 'lung-ros1',
    cancerType: '肺癌',
    shortTitle: 'ROS1 融合肺癌',
    title: '一例 ROS1 融合肺癌精准治疗临床病例分享',
    subtitle: '从靶向耐药、再活检到新一代 ROS1 抑制剂',
    doctor: '薛锦慧',
    hospital: '中山大学附属肿瘤防治中心',
    difficulty: '挑战',
    minutes: 12,
    color: 'violet',
    image: './assets/cases/lung-ros1-home.png',
    source:
      '肺癌 薛锦慧-中山大学附属肿瘤防治中心-一例ROS1融合肺癌精准治疗临床病例分享.pdf',
    summary: [
      { label: '患者画像', value: '女性，50 岁；肺腺癌伴多发脑转移。' },
      {
        label: '初始分子检测',
        value: 'CD74–ROS1 融合阳性；EGFR、ALK、KRAS、BRAF、RET 等阴性。',
      },
      {
        label: '疾病分期',
        value: '右肺腺癌 T4N3M1c，IVB 期；颅内与胸内病灶均需全程管理。',
      },
      {
        label: '核心难点',
        value: '多线 ROS1 靶向治疗后耐药，如何安排化疗、再活检与后续精准治疗。',
      },
    ],
    timeline: [
      {
        date: '2020.12',
        title: '一线 ROS1 靶向治疗',
        detail: '塞瑞替尼治疗，最佳疗效 PR，PFS 约 10 个月。',
      },
      {
        date: '2021.09',
        title: '颅内进展',
        detail: '多发脑转移进展，接受全脑放疗并延续原靶向治疗。',
      },
      {
        date: '2021.12',
        title: '二线临床研究',
        detail: '进入 APG-2449 研究，疾病稳定，PFS 约 8 个月。',
      },
      {
        date: '2022.09',
        title: '化疗联合抗血管',
        detail: '培美曲塞、卡铂联合贝伐珠单抗，5 个周期后获得 PR。',
      },
      {
        date: '2023.08',
        title: '再活检明确耐药',
        detail: '检测到 ROS1 D869Y 与 TP53 改变，为后续精准选择提供依据。',
      },
      {
        date: '2023.09+',
        title: '新一代选择性 ROS1 抑制剂',
        detail: '进入 JYP0322 研究并持续获得 PR。',
      },
    ],
    questions: [
      {
        id: 'lung-q1',
        domain: '分子诊断',
        prompt: '决定本例初始精准治疗路径的关键分子事件是什么？',
        context: '患者为肺腺癌伴脑转移，多基因检测已完成。',
        options: ['EGFR 19 外显子缺失', 'EML4–ALK 融合', 'CD74–ROS1 融合', 'KRAS G12C 突变'],
        correctIndex: 2,
        explanation:
          '本例检测到 CD74–ROS1 融合，而常见的 EGFR、ALK、KRAS 等驱动事件阴性。ROS1 融合既解释了初始靶向获益，也贯穿后续耐药机制与药物选择。',
        takeaways: ['先确认可操作的驱动事件', '分子结果要贯穿全程治疗'],
        evidence: '病例原始分子检测结果',
      },
      {
        id: 'lung-q2',
        domain: '耐药管理',
        prompt: '多线 ROS1 抑制剂治疗后出现系统性进展，最应优先补充哪一步？',
        context: '胸内与颅内病灶同步进展，既往尚未明确耐药机制。',
        options: ['仅复查肿瘤标志物', '立即更换为免疫单药', '再次组织活检并行分子检测', '继续原方案观察 3 个月'],
        correctIndex: 2,
        explanation:
          '靶向治疗后的进展可能由靶点内突变、旁路激活或组织学改变驱动。再活检可直接影响下一步药物选择；本例随后检出 ROS1 D869Y，印证了这一步的价值。',
        takeaways: ['耐药后尽量获取新组织', '不要只依据初诊分子结果'],
        evidence: '病例再活检与耐药检测结果',
      },
      {
        id: 'lung-q3',
        domain: '治疗决策',
        prompt: '患者一度拒绝再活检，且多线靶向后进展，病例中采用了哪种过渡方案？',
        context: '需要兼顾全身控制并为后续精准治疗争取时间。',
        options: [
          '培美曲塞 + 卡铂 + 贝伐珠单抗',
          '多西他赛单药',
          '帕博利珠单抗单药',
          '同步胸部放化疗',
        ],
        correctIndex: 0,
        explanation:
          '病例使用培美曲塞、卡铂联合贝伐珠单抗，5 个周期后获得 PR，随后进行培美曲塞维持。这说明在驱动基因阳性肺癌靶向失败后，含培美曲塞化疗联合抗血管仍可提供有效疾病控制。',
        takeaways: ['靶向失败后仍需系统性治疗', '过渡方案也应兼顾后续路径'],
        evidence: '病例 2022 年治疗经过',
      },
      {
        id: 'lung-q4',
        domain: '治疗决策',
        prompt: '再活检检出 ROS1 D869Y 后，最符合病例精准治疗思路的选择是？',
        context: '患者一般状态允许，且存在新一代选择性 ROS1 抑制剂研究机会。',
        options: ['继续原 ROS1 抑制剂不调整', '参加新一代 ROS1 抑制剂临床研究', '改用内分泌治疗', '仅给予最佳支持治疗'],
        correctIndex: 1,
        explanation:
          '明确 ROS1 耐药位点后，病例进入新一代选择性 ROS1 抑制剂 JYP0322 的 I 期研究，并再次获得持续 PR，体现了“再活检—识别耐药—匹配新药”的精准闭环。',
        takeaways: ['用耐药机制指导新药匹配', '合适患者应关注临床研究'],
        evidence: '病例 JYP0322 临床研究随访',
      },
      {
        id: 'lung-q5',
        domain: '随访管理',
        prompt: '患者进入新一代 ROS1 抑制剂研究并持续 PR，后续随访最合理的做法是？',
        context: '患者既往同时存在胸内病灶与多发脑转移，当前治疗仍在持续获益。',
        options: ['仅在出现症状后复查', '只监测胸部 CT', '同步评估颅内与全身病灶并监测治疗安全性', '达到 PR 后立即永久停药'],
        correctIndex: 2,
        explanation:
          '既往存在颅内和系统性病灶，持续 PR 期间仍应按研究方案同步进行颅内、胸腹部疗效评估，并结合实验室与临床表现监测药物安全性，避免单一部位评价遗漏进展。',
        takeaways: ['随访范围要覆盖既往全部病灶', '持续获益也需要同步评估疗效与安全性'],
        evidence: '病例 JYP0322 治疗与持续随访信息',
      },
    ],
  },
  {
    id: 'esophageal-vaccine',
    cancerType: '食管癌',
    shortTitle: '新抗原疫苗联合免疫',
    title: '个体化新抗原疫苗联合免疫治疗在食管鳞癌术后辅助治疗中的疗效与挑战',
    subtitle: '一例神经内分泌转化病例报告',
    doctor: '陈月云',
    hospital: '四川大学华西医院',
    difficulty: '挑战',
    minutes: 13,
    color: 'cyan',
    image: './assets/cases/esophageal-vaccine.png',
    source:
      '食管癌 陈月云-四川大学华西医院-—个体化新抗原疫苗联合免疫治疗在食管鳞癌术后辅助治疗中的疗效与挑战：一例神经内分化转化病例报告.pdf',
    summary: [
      { label: '患者画像', value: '男性，60 岁；进行性吞咽困难 3 月余。' },
      {
        label: '初始诊断',
        value: '胸中下段食管鳞癌，伴锁骨上转移淋巴结，cT4bN0M1，IVB 期。',
      },
      {
        label: '转化治疗',
        value: '白蛋白紫杉醇 + 卡铂 + 卡瑞利珠单抗 2 周期后 PR，获得手术机会。',
      },
      {
        label: '核心难点',
        value: '术后疫苗联合免疫的获益判断，以及进展后神经内分泌转化的识别。',
      },
    ],
    timeline: [
      {
        date: '2021.02',
        title: '诊断与转化治疗',
        detail: '两周期化疗联合卡瑞利珠单抗后 PR，由不可切除转为可手术。',
      },
      {
        date: '2021.05',
        title: '微创食管切除',
        detail: '术后 ypT3N0M0，II 期，切缘阴性。',
      },
      {
        date: '2021.07+',
        title: '术后研究治疗',
        detail: '帕博利珠单抗联合个体化新抗原疫苗，按计划完成初免与加强。',
      },
      {
        date: '2022.10',
        title: '首次寡进展',
        detail: '锁骨上及上纵隔淋巴结进展，局部放疗后继续联合治疗。',
      },
      {
        date: '2023.06',
        title: '再次活检',
        detail: '复发灶呈食管鳞癌伴神经内分泌分化，Ki-67 约 85%。',
      },
      {
        date: '2023.07–09',
        title: '快速进展',
        detail: 'EP 化疗后严重骨髓抑制，随后多器官转移，OS 30.6 个月。',
      },
    ],
    questions: [
      {
        id: 'eso-q1',
        domain: '治疗决策',
        prompt: '初诊为 cT4bN0M1 的食管鳞癌，本例首先采取的治疗目标是什么？',
        context: '病灶初始不可直接根治性切除，但患者一般状况可耐受联合治疗。',
        options: ['直接姑息照护', '通过系统治疗争取转化切除', '立即单纯手术', '仅行内镜下切除'],
        correctIndex: 1,
        explanation:
          '病例使用白蛋白紫杉醇、卡铂联合卡瑞利珠单抗 2 周期，获得 PR 并进入手术。此处治疗重点不是简单缩瘤，而是通过 MDT 判断能否把不可切除状态转化为可根治性处理。',
        takeaways: ['转化治疗要预设可评估目标', '治疗后及时回到 MDT 复评'],
        evidence: '病例初始治疗与手术经过',
      },
      {
        id: 'eso-q2',
        domain: '治疗决策',
        prompt: '术后选择个体化新抗原疫苗联合帕博利珠单抗，最准确的定位是？',
        context: '患者术后仍有较高复发风险，进入前瞻性临床研究。',
        options: ['已确立的标准术后方案', '探索性研究治疗', '替代所有影像随访', '仅用于缓解吞咽困难'],
        correctIndex: 1,
        explanation:
          '个体化新抗原疫苗联合免疫在该场景仍属于探索性治疗。本例显示了潜在免疫学与疾病控制价值，但不能据单个病例等同为标准方案，必须在规范研究与严密随访中评价。',
        takeaways: ['区分标准治疗与探索性治疗', '病例获益不能替代更高级别证据'],
        evidence: '病例研究 NCT050239280 及随访',
      },
      {
        id: 'eso-q3',
        domain: '耐药管理',
        prompt: '第二次进展时重新活检最关键的发现是什么？',
        context: '疾病行为较此前明显加速，需要排除耐药机制或组织学改变。',
        options: ['HER2 扩增', '小细胞/神经内分泌方向转化', '完全病理缓解', '单纯放射性炎症'],
        correctIndex: 1,
        explanation:
          '复发灶仍保留鳞癌标志物，同时出现 CgA、Syn、CD56 表达及 Ki-67 约 85%，支持食管鳞癌伴神经内分泌分化/转化。组织学变化可解释快速进展，并会显著改变后续治疗策略。',
        takeaways: ['异常快速进展要警惕组织学转化', '新病灶活检可重写治疗路径'],
        evidence: '病例 2023 年复发灶病理',
      },
      {
        id: 'eso-q4',
        domain: '不良反应',
        prompt: '神经内分泌转化后拟行 EP 化疗，最需要同步纳入决策的因素是？',
        context: '患者既往治疗线数较多，后续发生严重骨髓抑制与体能下降。',
        options: ['只看病理名称', '忽略既往毒性继续足量治疗', '体能状态、骨髓储备与获益风险', '暂停所有支持治疗'],
        correctIndex: 2,
        explanation:
          '病理转化提示含铂联合依托泊苷的治疗方向，但多线治疗后的骨髓储备、器官功能和体能状态决定方案能否安全实施。本例严重骨髓抑制提醒决策必须同时包含剂量、支持治疗与风险沟通。',
        takeaways: ['病理匹配不等于患者一定耐受', '疗效与安全必须在同一次决策中权衡'],
        evidence: '病例 EP 化疗后不良反应与结局',
      },
      {
        id: 'eso-q5',
        domain: '疗效评估',
        prompt: '首次出现锁骨上及上纵隔淋巴结寡进展时，本例采取了哪种处理思路？',
        context: '其余病灶仍受控，患者正在接受研究性疫苗联合免疫治疗。',
        options: ['立即停止全部治疗且不再评估', '对进展灶局部放疗并继续密切评估系统治疗获益', '仅口服抗生素', '直接进行第二次食管切除'],
        correctIndex: 1,
        explanation:
          '病例在首次寡进展时对锁骨上及上纵隔淋巴结给予局部放疗，并在评估总体获益后继续联合治疗。这体现了对有限进展进行局部控制、同时动态判断系统治疗价值的思路。',
        takeaways: ['寡进展要区分局部失控与全面耐药', '局部治疗后仍需严密复评'],
        evidence: '病例 2022 年首次寡进展处理经过',
      },
    ],
  },
  {
    id: 'gastric-her2',
    cancerType: '胃癌',
    shortTitle: 'HER2 过表达胃癌',
    title: '一例 HER2 过表达进展期胃癌全程治疗管理病例分享',
    subtitle: '系统治疗、转化手术与免疫相关不良反应管理',
    doctor: '钱焱',
    hospital: '中山大学附属第一医院',
    difficulty: '进阶',
    minutes: 11,
    color: 'rose',
    image: './assets/cases/gastric-her2.png',
    source:
      '胃癌 钱焱-中山大学附属第一医院一例HER2过表达进展期胃癌全程治疗管理病例分享.pdf',
    summary: [
      { label: '患者画像', value: '男性，65 岁；ECOG 1，胸骨后疼痛半年余。' },
      {
        label: '病理分子',
        value: '胃低分化腺癌；HER2 IHC 3+、FISH 阳性，MSS/pMMR，PD-L1 CPS 5。',
      },
      {
        label: '疾病分期',
        value: 'Borrmann IV 型，cT4N3M1，IV 期，腹膜后淋巴结转移。',
      },
      {
        label: '核心难点',
        value: '三联系统治疗后的转化手术窗口，以及免疫相关糖尿病与间质性肺炎。',
      },
    ],
    timeline: [
      {
        date: '2022.08',
        title: '分子分型与 MDT',
        detail: 'HER2 过表达、PD-L1 CPS 5；判断为潜在可切除的局限转移。',
      },
      {
        date: '2022.08–10',
        title: '新辅助/转化治疗',
        detail: 'SOX + 曲妥珠单抗 + 帕博利珠单抗 3 周期，疗效 PR。',
      },
      {
        date: '2022.10.20',
        title: '根治性手术',
        detail: '全胃切除联合腹主动脉旁淋巴结清扫。',
      },
      {
        date: '术后病理',
        title: '显著病理缓解',
        detail: 'TRG 1，0/80 淋巴结转移，ypT1bN0M0，I 期。',
      },
      {
        date: '2023.01–05',
        title: '免疫相关不良反应',
        detail: '先后出现免疫相关糖尿病/酮症酸中毒与间质性肺炎，暂停抗肿瘤治疗并处理。',
      },
      {
        date: '2025.06',
        title: '门诊随访',
        detail: '增强 CT 未见复发转移，肿瘤标志物未见异常升高。',
      },
    ],
    questions: [
      {
        id: 'gastric-q1',
        domain: '分子诊断',
        prompt: '哪组结果最直接支持本例加入抗 HER2 与免疫治疗？',
        context: '病理为进展期胃低分化腺癌，已完成免疫组化与原位杂交。',
        options: ['HER2 IHC 0、CPS 0', 'HER2 IHC 3+/FISH 阳性、CPS 5', 'EBER 阳性、HER2 阴性', 'MSI-H、HER2 IHC 1+'],
        correctIndex: 1,
        explanation:
          'HER2 IHC 3+ 且 FISH 阳性确认 HER2 过表达/扩增，PD-L1 CPS 5 为免疫联合提供分层信息。病例据此在化疗基础上加入曲妥珠单抗与帕博利珠单抗。',
        takeaways: ['HER2 结果需按规范判读', '治疗前完成关键分子分型'],
        evidence: '病例 HER2、MMR、EBER 与 PD-L1 检测',
      },
      {
        id: 'gastric-q2',
        domain: '治疗决策',
        prompt: 'MDT 为何选择 SOX + 曲妥珠单抗 + 帕博利珠单抗？',
        context: '患者为 HER2 阳性、PD-L1 CPS 5 的 IV 期胃癌，转移范围被判断为潜在可切除。',
        options: ['仅为缓解疼痛', '提高降期和根治性切除机会', '替代所有后续手术', '因为患者为 MSI-H'],
        correctIndex: 1,
        explanation:
          '治疗目标是以有效的全身治疗获得降期，再根据复评结果争取根治性手术。3 个周期后影像与肿瘤标志物明显改善并达到 PR，成为再次 MDT 评估手术窗口的依据。',
        takeaways: ['转化治疗要从一开始定义手术目标', '影像、标志物和体能状态需综合复评'],
        evidence: '病例 MDT 结论与 3 周期疗效评估',
      },
      {
        id: 'gastric-q3',
        domain: '疗效评估',
        prompt: '术后 ypT1bN0M0、TRG 1、0/80 淋巴结最能说明什么？',
        context: '术前为 cT4N3M1 的 Borrmann IV 型胃癌。',
        options: ['治疗完全无效', '获得显著降期与病理缓解', '已经证实远处复发', '提示 HER2 检测错误'],
        correctIndex: 1,
        explanation:
          '与治疗前 IV 期相比，术后 ypT1bN0M0、TRG 1 且 80 枚淋巴结均阴性，说明系统治疗带来了显著病理缓解与降期，也支持转化手术策略在这一精选患者中的价值。',
        takeaways: ['病理评估是转化治疗的重要终点', '不要只用单一影像指标判断获益'],
        evidence: '病例术后病理与分期',
      },
      {
        id: 'gastric-q4',
        domain: '不良反应',
        prompt: '术后辅助治疗期间出现酮症酸中毒，随后又发生间质性肺炎，优先策略是？',
        context: '两项并发症均考虑与免疫治疗相关，已影响治疗安全。',
        options: ['继续原方案且不监测', '暂停相关抗肿瘤治疗并规范处理并发症', '仅使用止痛药观察', '立即再次手术'],
        correctIndex: 1,
        explanation:
          '严重免疫相关不良反应需要及时识别、暂停相关治疗并进行专科处理。本例在控制糖代谢危象和间质性肺炎后，以随访为主，长期未见复发，体现了疗效之外的全程安全管理。',
        takeaways: ['免疫治疗期间主动监测内分泌与肺部毒性', '严重毒性时患者安全优先于维持疗程'],
        evidence: '病例免疫相关糖尿病与间质性肺炎处理',
      },
      {
        id: 'gastric-q5',
        domain: '随访管理',
        prompt: '严重免疫相关不良反应控制后，患者长期未见复发，当前随访重点是什么？',
        context: '抗肿瘤治疗已暂停，既往发生免疫相关糖尿病与间质性肺炎。',
        options: ['只复查肿瘤标志物', '完全停止随访', '兼顾肿瘤复发监测与免疫相关器官功能管理', '无条件恢复原免疫方案'],
        correctIndex: 2,
        explanation:
          '本例后续增强 CT 与肿瘤标志物均未提示复发，但既往严重免疫相关糖尿病和肺炎仍需长期专科管理。随访应同时覆盖肿瘤学结局与持续性免疫毒性，而不能只关注其中一端。',
        takeaways: ['随访既看复发也看长期毒性', '严重免疫不良反应需要跨专科持续管理'],
        evidence: '病例 2025 年随访及既往免疫相关不良反应记录',
      },
    ],
  },
]

const ros1Case = grandRoundCases.find((item) => item.id === 'lung-ros1')
const esophagealCase = grandRoundCases.find(
  (item) => item.id === 'esophageal-vaccine',
)
const gastricCase = grandRoundCases.find((item) => item.id === 'gastric-her2')

if (!ros1Case || !esophagealCase || !gastricCase) {
  throw new Error('A published case definition is missing')
}

ros1Case.difficulty = '进阶'
ros1Case.questions = buildPublishedQuestions(
  ros1PublishedQuestionSet,
  ros1Case.id,
)

esophagealCase.difficulty = '进阶'
esophagealCase.questions = buildPublishedQuestions(
  esophagealPublishedQuestionSet,
  esophagealCase.id,
)

gastricCase.difficulty = '进阶'
gastricCase.questions = buildPublishedQuestions(
  gastricPublishedQuestionSet,
  gastricCase.id,
)

export const publishedGrandRoundCases: GrandRoundCase[] = [
  ros1Case,
  esophagealCase,
  gastricCase,
]

export function getCaseById(caseId: string) {
  return (
    publishedGrandRoundCases.find((item) => item.id === caseId) ??
    publishedGrandRoundCases[0]
  )
}
