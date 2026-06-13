import React, { useState, useRef, useMemo, useEffect } from 'react'
import {
  Button, Card, Col, InputNumber, Popconfirm,
  Row, Slider, Space, Tag, Tooltip, Typography, message, theme
} from 'antd'
import {
  CaretRightOutlined, DeleteOutlined, HistoryOutlined,
  PauseOutlined, ThunderboltOutlined
} from '@ant-design/icons'
import styled from 'styled-components'

const { Title, Text } = Typography
const { useToken } = theme

type SessionState = 'idle' | 'drilling' | 'paused' | 'done'

export interface LogEntry {
  id: string
  type: 'depth' | 'layer'
  time: string
  elapsedMs: number
  depth: number
  layer: string
}

const LAYERS = [
  { name: 'Хоосон чулуулаг', icon: '🟧', color: '#d48806' },
  { name: 'Элсэн чулуу',     icon: '🟨', color: '#a89030' },
  { name: 'Шавар',           icon: '🟤', color: '#8c6a3f' },
  { name: 'Нүүрс',           icon: '⬛', color: '#262626' },
  { name: 'Завсар үе',       icon: '🟩', color: '#389e0d' },
  { name: 'Шавран чулуу',    icon: '🔴', color: '#cf1322' },
  { name: 'Хатуу чулуулаг',  icon: '⬜', color: '#434343' },
  { name: 'Ус',              icon: '💧', color: '#0284c7' },
]

const DEFAULT_LAYER = 'Хоосон чулуулаг'

const layerColor = (name: string) => LAYERS.find(l => l.name === name)?.color ?? '#bfbfbf'

// ─── Styled components ────────────────────────────────────────────────────────

const LayerDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: ${p => p.$color};
  flex-shrink: 0;
  vertical-align: middle;
`

const PageWrap = styled.div<{ $bg: string }>`
  padding: 24px;
  background: ${p => p.$bg};
  min-height: 100vh;
`

const CardSpacer = styled.div`
  margin-bottom: 16px;
`

const TimerTitle = styled(Title)`
  && { margin: 0; font-family: monospace; }
`

const PauseLabel = styled(Text)`
  && { font-size: 11px; font-weight: bold; }
`

const DepthCardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
`

const LayerBtnCol = styled(Col)`
  padding-top: 20px;
`

const LogScroll = styled.div`
  max-height: 200px;
  overflow-y: auto;
`

const LogRowWrap = styled.div<{ $borderColor: string }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid ${p => p.$borderColor};
`

const LogTime = styled(Text)`
  && { width: 48px; font-size: 11px; }
`

const LogDepth = styled(Text)`
  && { font-family: monospace; }
`

const LogLayerName = styled(Text)<{ $color: string }>`
  && { font-size: 11px; color: ${p => p.$color}; }
`

const ProfileWrap = styled.div<{ $bg: string; $radius: number }>`
  display: flex;
  height: 550px;
  padding: 10px 0;
  background: ${p => p.$bg};
  border-radius: ${p => p.$radius}px;
  overflow: hidden;
`

const DepthAxis = styled.div<{ $borderColor: string }>`
  width: 45px;
  position: relative;
  border-right: 2px solid ${p => p.$borderColor};
  margin-right: 10px;
`

const AxisTick = styled.div<{ $top: string; $color: string }>`
  position: absolute;
  top: ${p => p.$top};
  right: 8px;
  font-size: 10px;
  color: ${p => p.$color};
  transform: translateY(-50%);
`

const CrossSection = styled.div<{ $bg: string; $border: string }>`
  flex: 1;
  background: ${p => p.$bg};
  position: relative;
  border: 1px solid ${p => p.$border};
  border-radius: 4px;
  overflow: hidden;
`

const LayerSegment = styled.div<{ $top: string; $height: string; $bg: string }>`
  position: absolute;
  top: ${p => p.$top};
  height: ${p => p.$height};
  width: 100%;
  background: ${p => p.$bg};
  border-bottom: 1px solid rgba(255,255,255,0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #fff;
  text-shadow: 0 0 4px rgba(0,0,0,0.5);
  transition: all 0.3s ease;
`

const SegLabel = styled.span`
  font-size: 10px;
  font-weight: 500;
`

const DrillPointer = styled.div<{ $top: string; $bg: string }>`
  position: absolute;
  top: ${p => p.$top};
  width: 100%;
  height: 2px;
  background: ${p => p.$bg};
  z-index: 10;
  box-shadow: 0 0 8px rgba(255,0,0,0.5);
  transition: top 0.2s ease;
`

const DrillLabel = styled.div<{ $bg: string }>`
  position: absolute;
  right: 0;
  top: -18px;
  background: ${p => p.$bg};
  color: #fff;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
`

// ─── HoleProfile ──────────────────────────────────────────────────────────────

const HoleProfile = ({
  entries, designDepth, drillDepth, layerDepth, activeLayer,
}: {
  entries: LogEntry[]
  designDepth: number
  drillDepth: number
  layerDepth: number
  activeLayer: string
}) => {
  const { token } = useToken()

  const markers = useMemo(() =>
    entries.filter(e => e.type === 'layer').sort((a, b) => a.depth - b.depth),
    [entries]
  )

  const maxDepth = Math.max(designDepth, drillDepth, layerDepth, 1)
  const pct      = (d: number) => `${(d / maxDepth) * 100}%`

  const segments: { from: number; to: number; layer: string }[] = []

  if (markers.length === 0) {
    if (layerDepth > 0) segments.push({ from: 0, to: layerDepth, layer: activeLayer })
  } else {
    if (markers[0].depth > 0) segments.push({ from: 0, to: markers[0].depth, layer: markers[0].layer })
    for (let i = 0; i < markers.length - 1; i++) {
      const from = markers[i].depth
      const to   = markers[i + 1].depth
      if (to > from) segments.push({ from, to, layer: markers[i + 1].layer })
    }
    const lastEnd = markers[markers.length - 1].depth
    if (layerDepth > lastEnd) segments.push({ from: lastEnd, to: layerDepth, layer: activeLayer })
  }

  return (
    <ProfileWrap $bg={token.colorBgContainer} $radius={token.borderRadiusLG}>
      <DepthAxis $borderColor={token.colorBorderSecondary}>
        {Array.from({ length: Math.ceil(maxDepth) + 1 }, (_, m) => (
          <AxisTick key={m} $top={pct(m)} $color={token.colorTextSecondary}>{m}m</AxisTick>
        ))}
      </DepthAxis>

      <CrossSection $bg={token.colorFillSecondary} $border={token.colorBorder}>
        {segments.map((seg, idx) => {
          const h    = seg.to - seg.from
          const hPct = (h / maxDepth) * 100
          return (
            <Tooltip key={idx} title={`${seg.layer}: ${seg.from}м – ${seg.to}м`}>
              <LayerSegment $top={pct(seg.from)} $height={pct(h)} $bg={layerColor(seg.layer)}>
                {hPct > 4 && (
                  <>
                    <LayerDot $color="rgba(255,255,255,0.8)" />
                    <SegLabel>{seg.layer}</SegLabel>
                  </>
                )}
              </LayerSegment>
            </Tooltip>
          )
        })}

        <DrillPointer $top={pct(drillDepth)} $bg={token.colorError}>
          <DrillLabel $bg={token.colorError}>{drillDepth}m</DrillLabel>
        </DrillPointer>
      </CrossSection>
    </ProfileWrap>
  )
}

// ─── LogRow ───────────────────────────────────────────────────────────────────

const LogRow = ({ e, onDelete }: { e: LogEntry, onDelete: () => void }) => {
  const { token } = useToken()
  return (
    <LogRowWrap $borderColor={token.colorBorderSecondary}>
      <Space size="small">
        <LogTime type="secondary">{e.time}</LogTime>
        <LogDepth strong>{e.depth.toFixed(1)}м</LogDepth>
        {e.layer && <LayerDot $color={layerColor(e.layer)} />}
        <LogLayerName $color={layerColor(e.layer)}>{e.layer}</LogLayerName>
      </Space>
      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onDelete} />
    </LogRowWrap>
  )
}

// ─── StepSlider ───────────────────────────────────────────────────────────────

const StepSlider = ({ value, onChange, max }: { value: number, onChange: (v: number) => void, max: number }) => (
  <div>
    <Slider min={0} max={Math.max(max, 25)} step={0.1} value={value} onChange={onChange} />
    <Space size={4}>
      {[0.1, 0.5, 1.0].map(s => (
        <Button key={s} size="small" onClick={() => onChange(+(value + s).toFixed(1))}>+{s}м</Button>
      ))}
    </Space>
  </div>
)

// ─── DrillSession ─────────────────────────────────────────────────────────────

export default function DrillSession({
  holeId      = 'H-012',
  designDepth = 15.0,
  initialData = null,
  onComplete  = (d: any) => console.log('Complete:', d),
}: any) {
  const { token }  = useToken()
  const [msg, ctx] = message.useMessage()

  const [state, setState]           = useState<SessionState>(initialData ? 'done' : 'idle')
  const [elapsedMs, setElapsedMs]   = useState(initialData?.netDrillMs ?? 0)
  const [pausedMs, setPausedMs]     = useState(initialData?.totalPausedMs ?? 0)
  const [entries, setEntries]       = useState<LogEntry[]>(initialData?.entries ?? [])
  const [drillDepth, setDrillDepth] = useState(initialData?.finalDepth ?? 0)
  const [layerDepth, setLayerDepth] = useState(initialData?.finalDepth ?? 0)
  const [activeLayer, setActiveLayer] = useState(DEFAULT_LAYER)

  const timerRef      = useRef<any>(null)
  const pauseTimerRef = useRef<any>(null)
  const startTs       = useRef(0)
  const pauseStartTs  = useRef(0)
  const pauseBaseMs   = useRef(0)

  const maxLogged = useMemo(() =>
    entries.filter(e => e.type === 'depth').reduce((m, e) => Math.max(m, e.depth), 0),
    [entries]
  )

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  const startTimer     = () => { startTs.current = Date.now() - elapsedMs; timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTs.current), 1000) }
  const stopTimer      = () => clearInterval(timerRef.current)
  const stopPauseTimer = () => clearInterval(pauseTimerRef.current)
  useEffect(() => () => { stopTimer(); stopPauseTimer() }, [])

  const handlePause = () => {
    stopTimer()
    pauseStartTs.current  = Date.now()
    pauseBaseMs.current   = pausedMs
    pauseTimerRef.current = setInterval(() => setPausedMs(pauseBaseMs.current + (Date.now() - pauseStartTs.current)), 1000)
    setState('paused')
  }

  const handleResume = () => {
    stopPauseTimer()
    setPausedMs(pauseBaseMs.current + (Date.now() - pauseStartTs.current))
    setState('drilling')
    startTimer()
  }

  const handleComplete = () => {
    stopTimer()
    stopPauseTimer()
    const finalPaused = state === 'paused' ? pauseBaseMs.current + (Date.now() - pauseStartTs.current) : pausedMs
    setState('done')
    onComplete({ holeId, finalDepth: Math.max(maxLogged, drillDepth), netDrillMs: elapsedMs, totalPausedMs: finalPaused, entries, completedAt: new Date().toISOString() })
    msg.success('Цооногийн мэдээлэл хадгалагдлаа.')
  }

  const handleContinue = () => {
    startTs.current = Date.now() - elapsedMs
    setState('drilling')
    startTimer()
    msg.info('Өрөмдлөгийг үргэлжлүүллээ.')
  }

  const addEntry = (type: 'depth' | 'layer', depth: number) => {
    if (type === 'depth' && depth <= maxLogged) { msg.error(`Гүн ${maxLogged}м-ээс их байх ёстой!`); return }
    setEntries(prev => [...prev, {
      id: Math.random().toString(36).slice(2, 9),
      type, depth, elapsedMs,
      layer: type === 'layer' ? activeLayer : '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }])
    msg.success(`${type === 'layer' ? 'Үе өөрчлөгдлөө' : 'Гүн бүртгэгдлээ'}: ${depth}м`)
  }

  const removeEntry    = (id: string) => setEntries(prev => prev.filter(e => e.id !== id))
  const depthEntries   = entries.filter(e => e.type === 'depth')
  const layerEntries   = entries.filter(e => e.type === 'layer')

  return (
    <PageWrap $bg={token.colorBgLayout}>
      {ctx}
      <Row gutter={24}>
        <Col span={18}>

          {/* Header */}
          <CardSpacer>
            <Card>
              <Row justify="space-between" align="middle">
                <Space direction="vertical" size={0}>
                  <Title level={4} style={{ margin: 0 }}>Цооног: {holeId}</Title>
                  <Text type="secondary">Зорилтот гүн: {designDepth}м</Text>
                </Space>
                <Space direction="vertical" align="center">
                  <TimerTitle level={2}>{fmt(elapsedMs)}</TimerTitle>
                  <PauseLabel type="danger">ЗОГСОЛТ: {fmt(pausedMs)}</PauseLabel>
                </Space>
                <Space>
                  {state === 'idle'     && <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={() => { setState('drilling'); startTimer() }}>Өрөмдөж эхлэх</Button>}
                  {state === 'drilling' && <Button danger size="large" icon={<PauseOutlined />} onClick={handlePause}>Түр зогсоох</Button>}
                  {state === 'paused'   && <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={handleResume}>Үргэлжлүүлэх</Button>}
                  {state === 'done'
                    ? <Button size="large" icon={<CaretRightOutlined />} onClick={handleContinue}>Үргэлжлүүлэн өрөмдөх</Button>
                    : <Popconfirm title="Дуусгах уу?" onConfirm={handleComplete} okText="Тийм" cancelText="Үгүй"><Button type="primary" size="large">Дуусгах</Button></Popconfirm>
                  }
                </Space>
              </Row>
            </Card>
          </CardSpacer>

          {/* Depth logging */}
          <CardSpacer>
            <Card
              size="small"
              title="Өрөмдлөгийн явц"
              extra={<Text type="secondary" style={{ fontSize: 11 }}>Одоогийн гүн: <Text strong style={{ fontFamily: 'monospace' }}>{drillDepth}м</Text></Text>}
            >
              <StepSlider value={drillDepth} onChange={setDrillDepth} max={designDepth} />
              <DepthCardFooter>
                {drillDepth <= maxLogged
                  ? <Text type="danger" style={{ fontSize: 11 }}>{maxLogged}м-ээс их байх ёстой</Text>
                  : <span />
                }
                <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => addEntry('depth', drillDepth)} disabled={state !== 'drilling' && state !== 'paused'}>
                  Гүн бүртгэх: {drillDepth}м
                </Button>
              </DepthCardFooter>
            </Card>
          </CardSpacer>

          {/* Layer logging */}
          <CardSpacer>
            <Card
              size="small"
              title={
                <Space>
                  Хөрсний үе давхарга
                  <Tag color="orange"><Space size={4}><LayerDot $color={layerColor(activeLayer)} />{activeLayer}</Space></Tag>
                </Space>
              }
            >
              <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                {LAYERS.map(l => (
                  <Col span={6} key={l.name}>
                    <Button block size="small" type={activeLayer === l.name ? 'primary' : 'default'} onClick={() => setActiveLayer(l.name)}>
                      <Space size={4}><LayerDot $color={l.color} />{l.name}</Space>
                    </Button>
                  </Col>
                ))}
              </Row>
              <StepSlider value={layerDepth} onChange={setLayerDepth} max={designDepth} />
              <Row gutter={12} align="middle" style={{ marginTop: 8 }}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>ҮЕ ӨӨРЧЛӨГДСӨН ГҮН (м)</Text>
                  <InputNumber style={{ width: '100%' }} value={layerDepth} onChange={v => setLayerDepth(v ?? 0)} step={0.1} />
                </Col>
                <LayerBtnCol span={12}>
                  <Button block type="primary" ghost icon={<HistoryOutlined />} onClick={() => addEntry('layer', layerDepth)}>Давхаргыг бүртгэх</Button>
                </LayerBtnCol>
              </Row>
            </Card>
          </CardSpacer>

          {/* Log cards */}
          <Row gutter={12}>
            <Col span={12}>
              <Card size="small" title={<Space><Tag color="blue">ГҮН</Tag>Гүний бүртгэл</Space>}>
                <LogScroll>
                  {depthEntries.length === 0
                    ? <Text type="secondary" style={{ fontSize: 12 }}>Гүн бүртгэгдээгүй байна</Text>
                    : depthEntries.slice().reverse().map(e => <LogRow key={e.id} e={e} onDelete={() => removeEntry(e.id)} />)
                  }
                </LogScroll>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title={<Space><Tag color="orange">ҮЕ</Tag>Давхаргын өөрчлөлт</Space>}>
                <LogScroll>
                  {layerEntries.length === 0
                    ? <Text type="secondary" style={{ fontSize: 12 }}>Давхарга бүртгэгдээгүй байна</Text>
                    : layerEntries.slice().reverse().map(e => <LogRow key={e.id} e={e} onDelete={() => removeEntry(e.id)} />)
                  }
                </LogScroll>
              </Card>
            </Col>
          </Row>

        </Col>

        {/* Hole profile */}
        <Col span={6}>
          <Card title="Цооногийн зүсэлт">
            <HoleProfile
              entries={entries}
              designDepth={designDepth}
              drillDepth={drillDepth}
              layerDepth={layerDepth}
              activeLayer={activeLayer}
            />
          </Card>
        </Col>
      </Row>
    </PageWrap>
  )
}