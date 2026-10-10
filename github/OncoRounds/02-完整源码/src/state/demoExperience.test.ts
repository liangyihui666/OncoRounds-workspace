import { describe, expect, it } from 'vitest'
import { createDemoExperience, demoExperienceReducer as reduce, type DemoExperience, type DemoOutcome } from './demoExperience'
import { demoCases } from '../data/demo/catalog'

const generated = () => {
  let state = reduce(createDemoExperience(), {type:'generate',caseId:demoCases[8].id,outcome:'success'})
  for (let i=0; i<3; i++) state=reduce(state,{type:'tick',taskId:1})
  return state
}
describe('private round lifecycle', () => {
  it('creates one record on completion, ignoring duplicate ticks and concurrent jobs', () => {
    let state = reduce(createDemoExperience(), {type:'generate',caseId:demoCases[8].id,outcome:'success'})
    const ignored = reduce(state,{type:'generate',caseId:demoCases[0].id,outcome:'success'})
    expect(ignored).toBe(state)
    state = generated()
    expect(state.records).toHaveLength(1)
    expect(state.completionId).toBe(1)
    expect(reduce(state,{type:'tick',taskId:1})).toBe(state)
    expect(reduce(state,{type:'dismiss-completion'}).records).toHaveLength(1)
  })
  it.each(['upload','parse','generate','timeout'] as DemoOutcome[])('never creates a record after %s failure; retry completes once', outcome => {
    let state=reduce(createDemoExperience(),{type:'generate',caseId:demoCases[0].id,outcome})
    for(let i=0;i<3;i++) state=reduce(state,{type:'tick',taskId:1})
    expect(state.task?.status).toBe('failed')
    expect(state.records).toHaveLength(0)
    state=reduce(state,{type:'generate',caseId:demoCases[0].id,outcome:'success'})
    state=reduce(state,{type:'tick',taskId:1}) // obsolete task cannot advance retry
    expect(state.task?.stage).toBe(0)
    for(let i=0;i<3;i++) state=reduce(state,{type:'tick',taskId:2})
    expect(state.records).toHaveLength(1)
  })
  it('keeps private answers on exit and opens completed records at their saved summary', () => {
    let state: DemoExperience=reduce(generated(),{type:'open-record',id:1})
    state=reduce(state,{type:'round',action:{type:'start-round'}})
    state=reduce(state,{type:'round',action:{type:'select-answer',answerIndex:2}})
    state=reduce(state,{type:'round',action:{type:'submit-answer'}})
    state=reduce(state,{type:'round',action:{type:'go-home'}})
    expect(state.tab).toBe('mine')
    expect(state.records[0].status).toBe('in-progress')
    state=reduce(state,{type:'open-record',id:1})
    expect(state.round.isSubmitted).toBe(true)
    expect(state.round.selectedAnswer).toBe(2)
    for(let i=1;i<5;i++){
      state=reduce(state,{type:'round',action:{type:'next-question',questionCount:5}})
      state=reduce(state,{type:'round',action:{type:'select-answer',answerIndex:0}})
      state=reduce(state,{type:'round',action:{type:'submit-answer'}})
    }
    state=reduce(state,{type:'round',action:{type:'finish-round'}})
    expect(state.records[0].status).toBe('completed')
    state=reduce(state,{type:'round',action:{type:'go-home'}})
    state=reduce(state,{type:'open-record',id:1})
    expect(state.round.screen).toBe('summary')
    state=reduce(state,{type:'round',action:{type:'retry'}})
    expect(state.records[0].snapshot.answers).toEqual([])
    expect(createDemoExperience().records).toEqual([])
  })
  it('keeps the public category and selected case when returning home', () => {
    let state=reduce(createDemoExperience(),{type:'category',category:'乳腺癌'})
    state=reduce(state,{type:'select',caseId:demoCases[5].id})
    state=reduce(state,{type:'start-public'})
    state=reduce(state,{type:'round',action:{type:'go-home'}})
    expect(state.category).toBe('乳腺癌')
    expect(state.selectedCaseId).toBe(demoCases[5].id)
  })
})
