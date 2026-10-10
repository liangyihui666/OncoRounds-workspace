import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('renders the product title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '肿瘤医生大查房' })).toBeInTheDocument()
    expect(screen.getByText('OncoRounds')).toBeInTheDocument()
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
    expect(container.querySelector('.overview-hero')).toContainElement(
      screen.getByText('预计 12 分钟'),
    )
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

    await user.click(
      screen.getByRole('radio', {
        name: /继续原ROS1-TKI并联合适当的局部治疗/,
      }),
    )
    await user.click(screen.getByRole('button', { name: '提交答案' }))

    expect(screen.getByText('回答正确')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '主任解析' })).toBeInTheDocument()
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
    scrollTo.mockClear()
    await user.click(screen.getByRole('button', { name: '下一题' }))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(
      screen.getByRole('heading', { name: /曾接受塞瑞替尼及APG-2449治疗后/ }),
    ).toBeInTheDocument()
    expect(container.querySelector('nav')).not.toBeInTheDocument()
    expect(container.querySelector('aside')).not.toBeInTheDocument()
    scrollTo.mockRestore()
  })
})
