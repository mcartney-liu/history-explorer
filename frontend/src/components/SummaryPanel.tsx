type SummaryPanelProps = {
  title: string
  summary: string
}

function SummaryPanel({ title, summary }: SummaryPanelProps) {
  return (
    <>
      <h2 className="result-title">{title}</h2>
      <p className="result-summary">{summary}</p>
    </>
  )
}

export default SummaryPanel
