import { useEffect, useReducer, useState } from 'react'
import { CheckCircle, X } from '@phosphor-icons/react'
import { demoCases, getDemoCase } from './data/demo/catalog'
import { CaseOverview } from './components/CaseOverview'
import { HomeScreen } from './components/HomeScreen'
import { RoundSession } from './components/RoundSession'
import { RoundSummary } from './components/RoundSummary'
import { PrivateRounds, UploadForm, type UploadDraft } from './components/PrivateRounds'
import { Modal } from './components/Modal'
import { ActionButton } from './components/Ui'
import { createDemoExperience, demoExperienceReducer, type DemoOutcome } from './state/demoExperience'
import type { RoundFlowAction } from './state/roundFlow'
import './series.css'

const failures: Record<Exclude<DemoOutcome, 'success'>, { title: string; text: string }> = {
  upload: { title: '上传失败', text: '这是上传失败演示。可重试，体验正常完成流程。' },
  parse: { title: '图片看不清 / 解析失败', text: '这是解析失败演示。请重新选择一份清晰的资料后体验。' },
  generate: { title: '生成专属查房失败', text: '这是生成失败演示。请重新选择完整的病例资料后体验。' },
  timeout: { title: '处理超时', text: '这是超过 45 分钟的超时状态演示，未实际等待或处理资料。' },
}

export default function App() {
  const [experience, dispatch] = useReducer(demoExperienceReducer, undefined, createDemoExperience)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [upload, setUpload] = useState<UploadDraft>({ filename: '', caseId: demoCases[0].id, outcome: 'success' })
  const { round, task } = experience
  const currentCase = getDemoCase(round.currentCaseId)
  const filteredCases = demoCases.filter(item => item.category === experience.category)
  const currentIndex = filteredCases.findIndex(item => item.id === currentCase.id)
  const nextCase = experience.activeRecordId === null && filteredCases.length > 1
    ? filteredCases[(currentIndex + 1) % filteredCases.length] : undefined
  const roundDispatch = (action: RoundFlowAction) => dispatch({ type: 'round', action })
  const openRecord = (id: number) => { setUploadOpen(false); dispatch({ type: 'open-record', id }) }
  const busy = task?.status === 'running'
  const failure = task?.status === 'failed' && task.outcome !== 'success' ? failures[task.outcome] : null
  useEffect(() => { window.scrollTo(0, 0) }, [round.screen, round.currentCaseId])
  useEffect(() => {
    if (task?.status !== 'running') return
    const timer = window.setTimeout(() => dispatch({ type: 'tick', taskId: task.id }), 1000)
    return () => window.clearTimeout(timer)
  }, [task])
  const generate = () => {
    if (!upload.filename || busy) return
    setUploadOpen(false)
    dispatch({ type: 'generate', caseId: upload.caseId, outcome: upload.outcome })
  }
  const openUpload = () => { if (!busy) setUploadOpen(true) }
  return <div className="app-canvas">
    <div className="aurora aurora-one" aria-hidden="true" />
    <div className="aurora aurora-two" aria-hidden="true" />
    <div className="app-frame">
      {busy && <section className="generation-progress" aria-live="polite" aria-label="模拟生成进度">
        <div className="generation-label"><strong>正在生成专属查房</strong><span>模拟进度</span></div>
        <ol>{['自动脱敏', '决策提炼', '生成实战题'].map((label, index) =>
          <li key={label} className={index <= task.stage ? 'active' : ''}>
            <span>{index < task.stage ? <CheckCircle weight="fill" /> : index + 1}</span>{label}
          </li>)}</ol>
        <div role="progressbar" aria-label="演示生成进度" aria-valuemin={0} aria-valuemax={3} aria-valuenow={task.stage + 1}
          className="generation-track"><span style={{ transform: `scaleX(${(task.stage + 1) / 3})` }} /></div>
      </section>}
      {round.screen === 'home' && experience.bannerId !== null && <div className="generation-banner">
        <button type="button" onClick={() => openRecord(experience.bannerId!)}>专属查房已生成，去实战 →</button>
        <button type="button" aria-label="关闭生成提醒" onClick={() => dispatch({ type: 'dismiss-banner' })}><X /></button>
      </div>}
      {round.screen === 'home' && <HomeScreen
        cases={filteredCases} featuredCase={getDemoCase(experience.selectedCaseId)}
        category={experience.category} onCategory={category => dispatch({ type: 'category', category })}
        tab={experience.tab} onTab={tab => dispatch({ type: 'tab', tab })}
        onSelectCase={caseId => dispatch({ type: 'select', caseId })}
        onStart={() => dispatch({ type: 'start-public' })} onUpload={openUpload}
        privateContent={<PrivateRounds records={experience.records} onUpload={openUpload} onOpen={openRecord} />}
      />}
      {round.screen === 'overview' && <CaseOverview key={currentCase.id} clinicalCase={currentCase}
        onBack={() => roundDispatch({ type: 'go-home' })} onStart={() => roundDispatch({ type: 'start-round' })} />}
      {round.screen === 'round' && <RoundSession key={currentCase.id} clinicalCase={currentCase} state={round} dispatch={roundDispatch} />}
      {round.screen === 'summary' && <RoundSummary clinicalCase={currentCase} state={round}
        onHome={() => roundDispatch({ type: 'go-home' })} onRetry={() => roundDispatch({ type: 'retry' })}
        onNext={nextCase ? () => roundDispatch({ type: 'next-case', caseId: nextCase.id }) : undefined} />}
    </div>
    {uploadOpen && <Modal title="上传病例 · 交互演示" onClose={() => setUploadOpen(false)}>
      <UploadForm value={upload} onChange={setUpload} onGenerate={generate} busy={busy} />
    </Modal>}
    {experience.completionId !== null && <Modal title="查房已生成" onClose={() => dispatch({ type: 'dismiss-completion' })}>
      <div className="completion-copy"><CheckCircle size={48} weight="duotone" />
        <h3>专属查房已准备好</h3><p>{getDemoCase(experience.records.find(record => record.id === experience.completionId)!.caseId).shortTitle}</p>
        <small>演示结果来自已有题库，未解析所选文件。</small></div>
      <ActionButton onClick={() => openRecord(experience.completionId!)}>开始实战</ActionButton>
      <ActionButton tone="quiet" onClick={() => dispatch({ type: 'dismiss-completion' })}>稍后再说</ActionButton>
    </Modal>}
    {failure && <Modal title={failure.title} onClose={() => dispatch({ type: 'dismiss-task' })}>
      <p className="failure-copy">{failure.text}</p>
      <ActionButton onClick={() => {
        if (task?.outcome === 'parse' || task?.outcome === 'generate') {
          setUpload({ ...upload, filename: '', outcome: 'success' }); setUploadOpen(true)
          dispatch({ type: 'dismiss-task' })
        } else if (task) {
          dispatch({ type: 'generate', caseId: task.caseId, outcome: 'success' })
        }
      }}>{task?.outcome === 'parse' || task?.outcome === 'generate' ? '重新选择资料' : '重试演示'}</ActionButton>
      <ActionButton tone="quiet" onClick={() => dispatch({ type: 'dismiss-task' })}>取消</ActionButton>
    </Modal>}
  </div>
}
