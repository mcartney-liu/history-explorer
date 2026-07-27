import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MultiEntitySelectorView, type SelectableEntity } from './MultiEntitySelector'

const roman: SelectableEntity = { id: 'civ-roman', globalId: 't:civ-roman', name: 'Roman Empire', type: 'Civilization' }
const han: SelectableEntity = { id: 'civ-han', globalId: 't2:civ-han', name: 'Han Dynasty', type: 'Civilization' }
const persian: SelectableEntity = { id: 'civ-persian', globalId: 't3:civ-persian', name: 'Persian Empire', type: 'Civilization' }

describe('MultiEntitySelectorView', () => {
  it('renders empty state with add option', () => {
    const html = renderToStaticMarkup(
      <MultiEntitySelectorView
        selected={[]}
        available={[han]}
        onChange={() => {}}
      />,
    )
    expect(html).toContain('比较对象')
    expect(html).toContain('添加比较对象')
  })

  it('renders selected entity as tag', () => {
    const html = renderToStaticMarkup(
      <MultiEntitySelectorView
        selected={[han]}
        available={[]}
        onChange={() => {}}
      />,
    )
    expect(html).toContain('Han Dynasty')
  })

  it('shows remove button on selected tags', () => {
    const html = renderToStaticMarkup(
      <MultiEntitySelectorView
        selected={[han]}
        available={[]}
        onChange={() => {}}
      />,
    )
    expect(html).toContain('✕')
  })

  it('shows limit message when max reached', () => {
    const html = renderToStaticMarkup(
      <MultiEntitySelectorView
        selected={[han, persian]}
        available={[]}
        onChange={() => {}}
      />,
    )
    expect(html).toContain('最多选择 3 个研究对象')
  })

  it('filters already-selected from available options', () => {
    const html = renderToStaticMarkup(
      <MultiEntitySelectorView
        selected={[han]}
        available={[han, persian]}
        onChange={() => {}}
      />,
    )
    // Han appears as a selected tag, but Persian should be in the dropdown
    expect(html).toContain('Civilization: Persian Empire')
    expect(html).not.toContain('Civilization: Han Dynasty')
  })
})
