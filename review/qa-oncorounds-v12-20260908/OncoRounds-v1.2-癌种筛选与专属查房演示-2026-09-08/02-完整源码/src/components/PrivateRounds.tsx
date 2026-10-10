import { Camera, Images, FileArrowUp, Plus, ArrowRight, ClipboardText } from '@phosphor-icons/react'
import { useRef } from 'react'
import { demoCases, getDemoCase } from '../data/demo/catalog'
import type { DemoOutcome, PrivateRound } from '../state/demoExperience'
import { ActionButton } from './Ui'

export function PrivateRounds({ records, onUpload, onOpen }: {
  records: PrivateRound[]; onUpload: () => void; onOpen: (id: number) => void
}) {
  return <section className="private-rounds">
    <button type="button" className="create-round-entry" onClick={onUpload}>
      <Plus className="create-round-plus" /><span><strong>上传你的病例</strong>
        <small>自动脱敏 · 决策提炼 · 生成实战题（演示）</small></span><ArrowRight />
    </button>
    <div className="private-list-heading"><h2>我的专属查房</h2><span>本次访问</span></div>
    {records.length === 0 ? <div className="private-empty">
      <ClipboardText size={38} weight="duotone" /><h3>从一份病例开始</h3>
      <p>选择资料并体验生成流程，专属查房将出现在这里。</p>
    </div> : <div className="private-list">{[...records].reverse().map(record => {
      const item = getDemoCase(record.caseId)
      const text = record.status === 'completed' ? '查看总结' : record.status === 'in-progress' ? '继续查房' : '开始查房'
      return <button type="button" className="private-record" key={record.id} onClick={() => onOpen(record.id)}>
        <img src={item.image} alt="" /><span className="private-record-copy">
          <small>专属查房 {String(record.id).padStart(2, '0')} · 演示</small>
          <strong>{item.shortTitle}</strong><span className={`record-status ${record.status}`}>
            {record.status === 'completed' ? '已完成' : record.status === 'in-progress' ? '进行中' : '待查房'}
          </span><span className="record-action">{text}<ArrowRight /></span>
        </span>
      </button>
    })}</div>}
  </section>
}

export interface UploadDraft { filename: string; caseId: string; outcome: DemoOutcome }
export function UploadForm({ value, onChange, onGenerate, busy }: {
  value: UploadDraft; onChange: (value: UploadDraft) => void; onGenerate: () => void; busy: boolean
}) {
  const photo = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const document = useRef<HTMLInputElement>(null)
  const choose = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onChange({ ...value, filename: file.name })
  }
  return <div className="upload-form">
    <p className="demo-notice">交互演示：文件不会上传或解析</p>
    <p className="upload-intro">选择一份资料，体验从病例到专属查房的完整流程。</p>
    <div className="upload-methods">
      <button type="button" onClick={() => photo.current?.click()}><Images />照片图库</button>
      <button type="button" onClick={() => camera.current?.click()}><Camera />拍照</button>
      <button type="button" onClick={() => document.current?.click()}><FileArrowUp />选择文件</button>
    </div>
    <input ref={photo} hidden type="file" aria-label="照片图库文件" accept="image/*"
      onChange={event => { choose(event.target.files); event.target.value = '' }} />
    <input ref={camera} hidden type="file" aria-label="拍照文件" accept="image/*" capture="environment"
      onChange={event => { choose(event.target.files); event.target.value = '' }} />
    <input ref={document} hidden type="file" aria-label="病例文件" accept=".pdf,.doc,.docx,.txt,image/*"
      onChange={event => { choose(event.target.files); event.target.value = '' }} />
    <div className="picked-file" role="status">{value.filename ? <>已选择：<strong>{value.filename}</strong><small>再次选择可替换当前文件</small></> : '尚未选择资料'}</div>
    <label className="form-field">演示病例
      <select value={value.caseId} onChange={event => onChange({ ...value, caseId: event.target.value })}>
        {demoCases.map(item => <option value={item.id} key={item.id}>{item.shortTitle}</option>)}
      </select>
    </label>
    <p className="field-help">生成后展示所选演示病例的已有五题，与文件内容无关。</p>
    <details className="demo-controls"><summary>演示状态控制</summary>
      <label className="form-field">本次演示结果
        <select aria-label="本次演示结果" value={value.outcome}
          onChange={event => onChange({ ...value, outcome: event.target.value as DemoOutcome })}>
          <option value="success">正常完成</option><option value="upload">上传失败</option>
          <option value="parse">解析失败</option><option value="generate">生成失败</option>
          <option value="timeout">处理超时</option>
        </select>
      </label>
    </details>
    <ActionButton disabled={!value.filename || busy} onClick={onGenerate}>{busy ? '已有演示任务进行中' : '生成专属查房'}</ActionButton>
    <p className="field-help">记录仅保留在当前页面，刷新后清空。</p>
  </div>
}
