// src/pages/dashboard/components/CrmFunnelWidget.tsx
//
// Widget 8 — CRM funnel (hybrid responsive).
//
// Counts are **cumulative**: a stage shows how many contacts have *reached*
// it (their current stage is this one or further). This is what makes a
// funnel a funnel — conversions are always ≤ 100% and the shape tapers
// monotonically. See `computeCrmFunnelWidget` for the aggregation logic.
//
// Desktop : real funnel viz in SVG — 6 trapezoid segments stacked vertically,
// each segment morphs from its own count (top) to the next stage's count
// (bottom), producing a smooth tapering shape. Stage labels + conversion %
// rendered to the right of the SVG.
//
// Mobile : same data as colored stage cards stacked vertically with ↓ arrows
// between them showing the conversion %. SVG hidden on mobile because a
// 360-px-wide trapezoid funnel is hard to read.
//
// Both layouts share the same headline ratio "X messages → 1 client closé"
// computed from lifetime data + the closed_lost annotation.

import { ChevronDown, GitBranch } from 'lucide-react'
import { WidgetCard } from './WidgetCard'
import { getStage, getStageFillVar } from '@/features/crm/stages'
import type { DashboardData } from '@/features/dashboard/hooks'
import type { CrmFunnelStageData, CrmFunnelWidgetData } from '@/features/dashboard/api'

interface CrmFunnelWidgetProps {
  data: DashboardData
  className?: string
}

export function CrmFunnelWidget({ data, className }: CrmFunnelWidgetProps) {
  const { crmFunnel } = data
  const totalActive =
    crmFunnel.stages.reduce((acc, s) => acc + s.count, 0) + crmFunnel.closedLostCount
  const isEmpty = totalActive === 0

  return (
    <WidgetCard
      title="Pipeline de prospection"
      icon={<GitBranch className="h-4 w-4" aria-hidden />}
      loading={data.loading.contacts}
      skeletonVariant="list"
      error={data.error.contacts}
      onRetry={() => void data.refetch.contacts()}
      isEmpty={isEmpty}
      emptyMessage="Aucun prospect dans le pipeline"
      emptyAction={{ label: 'Ajouter un prospect', href: '/crm/pipeline' }}
      footerLabel="Voir le pipeline"
      footerHref="/crm/pipeline"
      className={className}
    >
      <div className="space-y-4">
        <RatioHeadline
          messagesPerWin={crmFunnel.messagesPerWin}
          everWon={crmFunnel.everWon}
        />

        {/* Mobile : cards stack */}
        <div className="md:hidden space-y-1.5">
          {crmFunnel.stages.map((s, i) => (
            <MobileStageCard
              key={s.stage}
              stage={s}
              isLast={i === crmFunnel.stages.length - 1}
            />
          ))}
        </div>

        {/* Desktop : SVG funnel + side labels */}
        <div className="hidden md:flex md:gap-6 md:items-stretch">
          <div className="w-full max-w-sm">
            <FunnelSvg funnel={crmFunnel} />
          </div>
          <ul className="flex-1 flex flex-col justify-around">
            {crmFunnel.stages.map(s => (
              <DesktopStageRow key={s.stage} stage={s} />
            ))}
          </ul>
        </div>

        {crmFunnel.closedLostCount > 0 ? (
          <p className="text-xs text-muted">
            {crmFunnel.closedLostCount} contact{crmFunnel.closedLostCount > 1 ? 's' : ''}{' '}
            en « Pas intéressé »
          </p>
        ) : null}
      </div>
    </WidgetCard>
  )
}

// ============================================================================
// Headline ratio
// ============================================================================

interface RatioHeadlineProps {
  messagesPerWin: number | null
  everWon: number
}

function RatioHeadline({ messagesPerWin, everWon }: RatioHeadlineProps) {
  if (messagesPerWin != null && everWon > 0) {
    return (
      <p className="text-sm text-muted">
        Tu envoies en moyenne{' '}
        <span className="font-semibold text-text">{messagesPerWin} messages</span>
        {' pour '}
        <span className="font-semibold text-text">1 client closé</span>
      </p>
    )
  }
  return (
    <p className="text-sm text-muted">
      Continue d'envoyer des messages — le premier client va arriver 🎯
    </p>
  )
}

// ============================================================================
// Mobile : cards stack with ↓ arrows
// ============================================================================

interface MobileStageCardProps {
  stage: CrmFunnelStageData
  isLast: boolean
}

function MobileStageCard({ stage, isLast }: MobileStageCardProps) {
  const stageDef = getStage(stage.stage)
  return (
    <div>
      <div
        className={[
          stageDef.bg,
          'rounded-xl px-4 py-3 flex items-center justify-between',
        ].join(' ')}
      >
        <span className={['text-sm font-medium', stageDef.text].join(' ')}>
          {stageDef.label}
        </span>
        <span
          className={['text-base font-semibold tabular-nums', stageDef.text].join(' ')}
        >
          {stage.count}
        </span>
      </div>
      {!isLast ? (
        <div className="flex items-center justify-center gap-1 py-1 text-xs text-muted">
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          {stage.conversionToNextPct != null ? (
            <span className="tabular-nums">{stage.conversionToNextPct}%</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

// ============================================================================
// Desktop : SVG funnel
// ============================================================================

const SVG_WIDTH = 300
const SVG_BAND_HEIGHT = 44
// max trapezoid width (leaves 20px padding each side)
const SVG_INNER_MAX = 260
// smallest non-empty trapezoid is at least 12% of max — prevents tiny stages
// from disappearing when one stage dominates the counts.
const SVG_INNER_MIN_RATIO = 0.12

function FunnelSvg({ funnel }: { funnel: CrmFunnelWidgetData }) {
  const { stages, maxCount } = funnel
  const totalHeight = stages.length * SVG_BAND_HEIGHT
  const cx = SVG_WIDTH / 2

  const widths = stages.map(s => {
    if (s.count === 0 || maxCount === 0) return 0
    const raw = (s.count / maxCount) * SVG_INNER_MAX
    return Math.max(raw, SVG_INNER_MAX * SVG_INNER_MIN_RATIO)
  })

  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${totalHeight}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-auto"
      role="img"
      aria-label="Entonnoir des stages du pipeline"
    >
      {stages.map((stage, i) => {
        const wTop = widths[i]
        // Last band: bottom width = top width (rectangular).
        // All others: bottom width = next stage's top width (smooth taper).
        const wBot = i < stages.length - 1 ? widths[i + 1] : wTop
        const yTop = i * SVG_BAND_HEIGHT
        const yBot = (i + 1) * SVG_BAND_HEIGHT
        const fill = getStageFillVar(stage.stage)

        if (wTop === 0 && wBot === 0) {
          return (
            <line
              key={stage.stage}
              x1={cx - 4}
              y1={(yTop + yBot) / 2}
              x2={cx + 4}
              y2={(yTop + yBot) / 2}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
          )
        }

        const points = [
          `${cx - wTop / 2},${yTop}`,
          `${cx + wTop / 2},${yTop}`,
          `${cx + wBot / 2},${yBot}`,
          `${cx - wBot / 2},${yBot}`,
        ].join(' ')

        return (
          <g key={stage.stage}>
            <polygon points={points} fill={fill} />
            {stage.count > 0 ? (
              <text
                x={cx}
                y={(yTop + yBot) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  fontWeight: 600,
                  fill: 'var(--color-text)',
                }}
              >
                {stage.count}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

// ============================================================================
// Desktop : side labels list
// ============================================================================

function DesktopStageRow({ stage }: { stage: CrmFunnelStageData }) {
  const stageDef = getStage(stage.stage)
  return (
    <li className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={[
            'inline-block h-2.5 w-2.5 rounded-full shrink-0',
            stageDef.bg,
          ].join(' ')}
          aria-hidden
        />
        <span className="text-sm text-text truncate">{stageDef.label}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-semibold tabular-nums text-text">
          {stage.count}
        </span>
        <span className="text-xs text-muted tabular-nums w-12 text-right">
          {stage.conversionToNextPct != null ? `↘ ${stage.conversionToNextPct}%` : ''}
        </span>
      </div>
    </li>
  )
}
