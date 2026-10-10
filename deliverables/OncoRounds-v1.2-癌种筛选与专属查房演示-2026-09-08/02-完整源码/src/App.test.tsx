import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('renders the product title', () => {
    const { container } = render(<App />)
    expect(screen.getByRole('heading', { name: '肿瘤医生大查房' })).toBeInTheDocument()
    expect(screen.getByText('OncoRounds')).toBeInTheDocument()
    expect(container.querySelector('.home-brand-mark')).toHaveAttribute(
      'src',
      './assets/brand/oncorounds-orb.png',
    )
  })

  it('shows one featured case and opens the ROS1 overview from the home CTA', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    expect(
      screen.getAllByRole('heading', { name: 'ROS1 融合肺癌精准治疗' }),
    ).toHaveLength(1)
    expect(screen.queryByText('选择本次病例')).not.toBeInTheDocument()
    expect(screen.queryByText('03 Cases')).not.toBeInTheDocument()
    expect(screen.queryByText('已选择')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '开始查房' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: '上一个病例' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '下一个病例' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /查看上一个病例/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /查看下一个病例/ })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: '首页栏目' })).toBeInTheDocument()
    expect(container.querySelector('.home-actions')).toContainElement(
      screen.getByRole('button', { name: '开始查房' }),
    )
    expect(container.querySelector('.screen-footer')).not.toBeInTheDocument()
    expect(screen.getByText('基于典型病例 · 训练临床决策')).toBeInTheDocument()
    expect(screen.getByText('内容仅用于医学学习')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '开始查房' }))

    expect(
      screen.getByRole('heading', {
        name: /ROS1 融合肺癌精准治疗临床病例分享/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '病程轴' })).toBeInTheDocument()
    expect(screen.queryByText('2023.09+')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: /治疗后影像疗效对比/ }),
    ).not.toBeInTheDocument()
  })

  it('lets a clinician select and enter the published esophageal case', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '食管癌' }))

    expect(
      screen.getByRole('heading', { name: '新抗原疫苗联合免疫' }),
    ).toBeInTheDocument()
    expect(screen.getByText('进阶难度')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '开始查房' }))

    expect(
      screen.getByRole('heading', {
        name: /个体化新抗原疫苗联合免疫治疗在食管鳞癌术后辅助治疗中的疗效与挑战/,
      }),
    ).toBeInTheDocument()
  })

  it('lets a clinician select and enter the published gastric case', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '胃癌' }))

    expect(
      screen.getByRole('heading', { name: 'HER2 过表达胃癌' }),
    ).toBeInTheDocument()
    expect(screen.getByText('进阶难度')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '开始查房' }))

    expect(
      screen.getByRole('heading', {
        name: /一例 HER2 过表达进展期胃癌全程治疗管理病例分享/,
      }),
    ).toBeInTheDocument()
  })

  it('lets a clinician swipe between published cases on the home screen', () => {
    render(<App />)

    const ros1Card = screen.getByRole('group', {
      name: /病例轮播：ROS1 融合肺癌/,
    })
    fireEvent.touchStart(ros1Card, {
      touches: [{ clientX: 300, clientY: 220 }],
    })
    fireEvent.touchEnd(ros1Card, {
      changedTouches: [{ clientX: 100, clientY: 224 }],
    })

    expect(
      screen.getByRole('group', { name: /病例轮播：ALK融合阳性肺腺鳞癌/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: '首页栏目' })).toBeInTheDocument()
  })

  it('does not expose internal case source on the overview', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '开始查房' }))

    expect(screen.queryByText('病例资料来源')).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        '肺癌 薛锦慧-中山大学附属肿瘤防治中心-一例ROS1融合肺癌精准治疗临床病例分享.pdf',
      ),
    ).not.toBeInTheDocument()
  })

  it('hides the case sharer and hospital on the overview', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: '开始查房' }))

    expect(screen.queryByText('病例分享')).not.toBeInTheDocument()
    expect(screen.queryByText('薛锦慧 医生')).not.toBeInTheDocument()
    expect(screen.queryByText('中山大学附属肿瘤防治中心')).not.toBeInTheDocument()
    expect(screen.queryByText(/预计\s*\d+\s*分钟/)).not.toBeInTheDocument()
    expect(container.querySelector('.overview-meta')).not.toBeInTheDocument()
  })

  it('lets a clinician submit a teaching answer for the featured case', async () => {
    const user = userEvent.setup()
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    const scrollIntoView = vi.mocked(Element.prototype.scrollIntoView)
    scrollIntoView.mockClear()
    const { container } = render(<App />)

    await user.click(screen.getByRole('button', { name: '开始查房' }))

    expect(screen.getByRole('heading', { name: /ROS1 融合肺癌精准治疗/ })).toBeInTheDocument()
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0)
    await user.click(screen.getByRole('button', { name: '开始模拟查房' }))

    expect(screen.getByText('主任提问')).toBeInTheDocument()
    expect(screen.queryByText('主治医师提问')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回主页' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '上一题' })).toBeDisabled()

    await user.click(
      screen.getByRole('radio', {
        name: /ROS1 酪氨酸激酶抑制剂（如克唑替尼）/,
      }),
    )
    await user.click(screen.getByRole('button', { name: '提交答案' }))

    expect(screen.getByText('回答正确')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '主任解析' })).toBeInTheDocument()
    const evidence = screen.getByLabelText('循证依据')
    expect(evidence).toHaveTextContent(
      '中国临床肿瘤学会（CSCO）非小细胞肺癌诊疗指南 2026',
    )
    expect(evidence).toHaveTextContent('2026')
    expect(evidence).not.toHaveTextContent('065ff4dc-ec1b-442e-8381-e8d820673576')
    expect(evidence).not.toHaveTextContent('split_index')
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
    scrollTo.mockClear()
    await user.click(screen.getByRole('button', { name: '下一题' }))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(screen.getByRole('button', { name: '上一题' })).toBeEnabled()
    expect(
      screen.getByRole('heading', { name: /出现 CNS 进展/ }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '上一题' }))
    expect(
      screen.getByRole('heading', { name: /患者确诊 ROS1 融合阳性 IVB 期肺腺癌/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('回答正确')).toBeInTheDocument()
    expect(container.querySelector('nav')).not.toBeInTheDocument()
    expect(container.querySelector('main.round-screen > aside')).not.toBeInTheDocument()
    scrollTo.mockRestore()
  })

  it('returns to the homepage from the clearly labeled round control', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '开始查房' }))
    await user.click(screen.getByRole('button', { name: '开始模拟查房' }))
    await user.click(screen.getByRole('button', { name: '返回主页' }))

    expect(
      screen.getByRole('heading', { name: '肿瘤医生大查房' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始查房' })).toBeInTheDocument()
  })

  it('keeps next-case navigation inside the selected cancer category', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '胃癌' }))
    await user.click(screen.getByRole('button', { name: '开始查房' }))
    await user.click(screen.getByRole('button', { name: '开始模拟查房' }))

    for (let questionIndex = 0; questionIndex < 5; questionIndex += 1) {
      await user.click(screen.getAllByRole('radio')[0])
      await user.click(screen.getByRole('button', { name: '提交答案' }))

      if (questionIndex < 4) {
        await user.click(screen.getByRole('button', { name: '下一题' }))
      }
    }

    await user.click(screen.getByRole('button', { name: '查看查房总结' }))

    expect(screen.queryByText('查房完成')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '真实治疗路径与后续结局' }),
    ).toBeInTheDocument()
    expect(screen.getByText('2025.06')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /下一病例/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /下一病例/ }))

    expect(
      screen.getByRole('heading', {
        name: /胃癌免疫治疗后的胆管损伤与随访/,
      }),
    ).toBeInTheDocument()
  })
})
