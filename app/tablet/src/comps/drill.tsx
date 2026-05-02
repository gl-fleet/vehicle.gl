import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Button,
    Card,
    Col,
    Divider,
    Input,
    Progress,
    Row,
    Space,
    Statistic,
    Tag,
    Timeline,
    Tooltip,
    Typography,
    message,
    theme,
} from 'antd';
import {
    CaretRightOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    ColumnHeightOutlined,
    PauseOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { useToken } = theme;

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionState = 'idle' | 'drilling' | 'paused' | 'done';

interface LogEntry {
    type: 'depth' | 'layer' | 'resume';
    time: string;
    elapsedMs: number;
    depth: number | null;
    layer: string | null;
    pen: string | null;
    pausedFor?: string;
}

interface LayerPreset {
    name: string;
    mn: string;
    icon: string;
    activeColor: string;
    activeBgLight: string;
    activeBgDark: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LAYER_PRESETS: LayerPreset[] = [
    { name: 'Topsoil',      mn: 'Дээд хөрс',             icon: '🟫', activeColor: '#8B5E3C', activeBgLight: '#f5ede6', activeBgDark: '#3d2010' },
    { name: 'Overburden',   mn: 'Хучлага үе',             icon: '🟧', activeColor: '#d48806', activeBgLight: '#fff7e6', activeBgDark: '#3d2b00' },
    { name: 'Sandstone',    mn: 'Элсэн чулуу',            icon: '🟨', activeColor: '#a89030', activeBgLight: '#feffe6', activeBgDark: '#363200' },
    { name: 'Clay',         mn: 'Шавар',                  icon: '🟤', activeColor: '#8c6a3f', activeBgLight: '#f0e8dc', activeBgDark: '#2e1e08' },
    { name: 'Coal Seam',    mn: 'Нүүрсний давхарга',      icon: '⬛', activeColor: '#595959', activeBgLight: '#f0f0f0', activeBgDark: '#1a1a1a' },
    { name: 'Interburden',  mn: 'Давхаргын завсар үе',    icon: '🟩', activeColor: '#389e0d', activeBgLight: '#f6ffed', activeBgDark: '#0d2b00' },
    { name: 'Mudstone',     mn: 'Шавран чулуу',           icon: '🔴', activeColor: '#cf1322', activeBgLight: '#fff1f0', activeBgDark: '#2a0005' },
    { name: 'Shale',        mn: 'Занар',                  icon: '🔵', activeColor: '#0958d9', activeBgLight: '#e6f4ff', activeBgDark: '#001d57' },
    { name: 'Hard Rock',    mn: 'Хатуу чулуулаг',         icon: '⬜', activeColor: '#434343', activeBgLight: '#fafafa', activeBgDark: '#141414' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number): string {
    return String(Math.floor(n)).padStart(2, '0');
}

function fmtMs(ms: number): string {
    const tot = Math.floor(ms / 1000);
    return `${pad(tot / 60)}:${pad(tot % 60)}`;
}

// ─── HoleHeader ───────────────────────────────────────────────────────────────

interface HoleHeaderProps {
    holeName: string;
    patternName: string;
    rigId: string;
    siteName: string;
    rowCol: string;
    designDepth: number;
    state: SessionState;
}

const HoleHeader: React.FC<HoleHeaderProps> = ({
    holeName, patternName, rigId, siteName, rowCol, designDepth, state,
}) => {
    const { token } = useToken();

    const stateConfig: Record<SessionState, { color: string; label: string }> = {
        idle:     { color: 'default',    label: 'Idle' },
        drilling: { color: 'success',    label: '● Drilling' },
        paused:   { color: 'warning',    label: '⏸ Paused' },
        done:     { color: 'processing', label: '✓ Done' },
    };
    const { color, label } = stateConfig[state];

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            background: token.colorBgElevated,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}>
            <Space direction="vertical" size={2}>
                <Space align="center" size={8}>
                    <Title level={5} style={{ margin: 0, fontFamily: 'monospace', color: token.colorText }}>
                        {holeName}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>{patternName}</Text>
                    <Tag color={color}>{label}</Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {rigId} · {siteName} · {rowCol}
                </Text>
            </Space>

            <div style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                    Design Depth
                </Text>
                <Title level={3} style={{ margin: 0, fontFamily: 'monospace', color: token.colorPrimary }}>
                    {designDepth.toFixed(1)}{' '}
                    <span style={{ fontSize: 16, fontWeight: 400, color: token.colorTextSecondary }}>m</span>
                </Title>
            </div>
        </div>
    );
};

// ─── LayerSelector ────────────────────────────────────────────────────────────

interface LayerSelectorProps {
    activeIndex: number | null;
    onSelect: (i: number | null) => void;
}

const LayerSelector: React.FC<LayerSelectorProps> = ({ activeIndex, onSelect }) => {
    const { token } = useToken();
    // Detect dark mode by checking if the container background is dark
    const isDark = token.colorBgContainer === '#141414';

    return (
        <div>
            <Text
                type="secondary"
                style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}
            >
                Soil / Formation Layer
            </Text>
            <Row gutter={[6, 6]}>
                {LAYER_PRESETS.map((layer, i) => {
                    const isActive = activeIndex === i;
                    return (
                        <Col span={8} key={layer.name}>
                            <Tooltip title={`${layer.name} · ${layer.mn}`}>
                                <button
                                    onClick={() => onSelect(isActive ? null : i)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 4px',
                                        border: `${isActive ? 2 : 1}px solid ${isActive ? layer.activeColor : token.colorBorderSecondary}`,
                                        borderRadius: token.borderRadiusSM,
                                        background: isActive
                                            ? (isDark ? layer.activeBgDark : layer.activeBgLight)
                                            : token.colorBgContainer,
                                        cursor: 'pointer',
                                        fontSize: 12,
                                        color: isActive ? layer.activeColor : token.colorTextSecondary,
                                        fontWeight: isActive ? 600 : 400,
                                        textAlign: 'center',
                                        lineHeight: 1.4,
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <span style={{ display: 'block', fontSize: 16, marginBottom: 2 }}>{layer.icon}</span>
                                    <div>{layer.name}</div>
                                    <div style={{ fontSize: 10, opacity: 0.7 }}>{layer.mn}</div>
                                </button>
                            </Tooltip>
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
};

// ─── SessionStats ─────────────────────────────────────────────────────────────

interface SessionStatsProps {
    elapsedMs: number;
    totalPausedMs: number;
    currentDepth: number | null;
    designDepth: number;
    avgPen: string | null;
    lastPen: string | null;
    activeLayer: string | null;
}

const SessionStats: React.FC<SessionStatsProps> = ({
    elapsedMs, totalPausedMs, currentDepth, designDepth, avgPen, lastPen, activeLayer,
}) => {
    const { token } = useToken();
    const remaining = currentDepth != null ? Math.max(0, designDepth - currentDepth) : designDepth;

    const statStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '6px 0',
    };
    // Use token values instead of hardcoded hex
    const labelStyle: React.CSSProperties = { fontSize: 12, color: token.colorTextSecondary };
    const valStyle: React.CSSProperties   = { fontSize: 15, fontWeight: 600, fontFamily: 'monospace', color: token.colorText };

    return (
        <Card size="small">
            <Text
                type="secondary"
                style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}
            >
                Session Stats
            </Text>

            <div style={statStyle}>
                <span style={labelStyle}><ClockCircleOutlined /> Elapsed (net)</span>
                <span style={valStyle}>{fmtMs(elapsedMs)}</span>
            </div>
            <Divider style={{ margin: '2px 0' }} />

            <div style={statStyle}>
                <span style={labelStyle}><PauseOutlined /> Pause time</span>
                <span style={{ ...valStyle, color: totalPausedMs > 0 ? token.colorWarning : token.colorText }}>
                    {fmtMs(totalPausedMs)}
                </span>
            </div>
            <Divider style={{ margin: '2px 0' }} />

            <div style={statStyle}>
                <span style={labelStyle}><ColumnHeightOutlined /> Current depth</span>
                <span style={valStyle}>{currentDepth != null ? `${currentDepth.toFixed(1)} m` : '—'}</span>
            </div>
            <Divider style={{ margin: '2px 0' }} />

            <div style={statStyle}>
                <span style={labelStyle}>Remaining</span>
                <span style={{ ...valStyle, color: remaining <= 1 ? token.colorSuccess : token.colorText }}>
                    {remaining.toFixed(1)} m
                </span>
            </div>
            <Divider style={{ margin: '2px 0' }} />

            <div style={statStyle}>
                <span style={labelStyle}><ThunderboltOutlined /> Avg pen. speed</span>
                <span style={valStyle}>{avgPen ? `${avgPen} m/min` : '—'}</span>
            </div>
            <Divider style={{ margin: '2px 0' }} />

            <div style={statStyle}>
                <span style={labelStyle}>Last pen. speed</span>
                <span style={valStyle}>{lastPen ? `${lastPen} m/min` : '—'}</span>
            </div>
            <Divider style={{ margin: '2px 0' }} />

            <div style={statStyle}>
                <span style={labelStyle}>Active layer</span>
                <span style={{ ...valStyle, fontSize: 12 }}>{activeLayer ?? '—'}</span>
            </div>
        </Card>
    );
};

// ─── DepthLog ─────────────────────────────────────────────────────────────────

interface DepthLogProps {
    entries: LogEntry[];
}

const DepthLog: React.FC<DepthLogProps> = ({ entries }) => {
    if (entries.length === 0) {
        return (
            <Text type="secondary" style={{ fontSize: 12 }}>
                No entries yet. Start drilling and log depths.
            </Text>
        );
    }

    const items = [...entries].reverse().map((e, idx) => {
        if (e.type === 'resume') {
            return {
                key: idx,
                color: 'orange',
                dot: <CaretRightOutlined style={{ color: '#fa8c16' }} />,
                children: (
                    <Space size={6} wrap>
                        <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>{e.time}</Text>
                        <Tag color="warning">▶ Resumed · paused for {e.pausedFor}</Tag>
                    </Space>
                ),
            };
        }
        return {
            key: idx,
            color: e.type === 'layer' ? 'blue' : 'green',
            children: (
                <Space size={6} wrap align="center" style={{ paddingTop: 5 }}>
                    <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>{e.time}</Text>
                    <Text strong style={{ fontFamily: 'monospace', fontSize: 14 }}>
                        {e.depth != null ? `${e.depth.toFixed(1)} m` : '—'}
                    </Text>
                    {e.pen && (
                        <Text type="secondary" style={{ fontSize: 11 }}>{e.pen} m/min</Text>
                    )}
                    {e.layer && <Tag>{e.layer}</Tag>}
                    {e.type === 'layer' && <Tag color="blue">layer ↓</Tag>}
                </Space>
            ),
        };
    });

    return <Timeline items={items} style={{ marginTop: 8 }} />;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export interface DrillSessionProps {
    holeId?: string;
    patternName?: string;
    rigId?: string;
    siteName?: string;
    rowCol?: string;
    designDepth?: number;
    onComplete?: (summary: CompleteSummary) => void;
}

export interface CompleteSummary {
    holeId: string;
    finalDepth: number;
    designDepth: number;
    netDrillMs: number;
    totalPauseMs: number;
    entries: LogEntry[];
}

const DrillSession: React.FC<DrillSessionProps> = ({
    holeId      = 'H-012',
    patternName = 'Pattern P-2024-031',
    rigId       = 'RIG-04',
    siteName    = 'Oyut Tolgoi · Open Pit A · Block 7',
    rowCol      = 'R4 C3',
    designDepth = 12.0,
    onComplete,
}) => {
    const { token } = useToken();

    const [sessionState, setSessionState] = useState<SessionState>('idle');
    const [elapsedMs, setElapsedMs]         = useState(0);
    const [totalPausedMs, setTotalPausedMs] = useState(0);
    const [activeLayerIdx, setActiveLayerIdx] = useState<number | null>(null);
    const [logEntries, setLogEntries]       = useState<LogEntry[]>([]);
    const [depthInput, setDepthInput]       = useState('');
    const [lastPen, setLastPen]             = useState<string | null>(null);

    const startTs     = useRef<number>(0);
    const pauseTs     = useRef<number>(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pausedAccum = useRef<number>(0);

    const [msgApi, contextHolder] = message.useMessage();

    // ── Timer ──────────────────────────────────────────────────────────────────

    const tick = useCallback(() => {
        setElapsedMs(Date.now() - startTs.current - pausedAccum.current);
    }, []);

    const startTimer = () => { intervalRef.current = setInterval(tick, 500); };
    const stopTimer  = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };

    useEffect(() => () => stopTimer(), []);

    // ── Derived values ─────────────────────────────────────────────────────────

    const depthEntries = logEntries.filter(e => e.depth != null);
    const currentDepth = depthEntries.length ? depthEntries[depthEntries.length - 1].depth : null;

    const avgPen: string | null = (() => {
        if (currentDepth == null || elapsedMs === 0) return null;
        const mins = elapsedMs / 60000;
        return mins > 0 ? (currentDepth / mins).toFixed(2) : null;
    })();

    const progressPct = currentDepth != null
        ? Math.min(100, (currentDepth / designDepth) * 100)
        : 0;

    // ── Actions ────────────────────────────────────────────────────────────────

    const handleStart = () => {
        startTs.current = Date.now();
        pausedAccum.current = 0;
        setElapsedMs(0);
        setTotalPausedMs(0);
        setSessionState('drilling');
        startTimer();
    };

    const handlePause = () => {
        stopTimer();
        pauseTs.current = Date.now();
        setSessionState('paused');
    };

    const handleResume = () => {
        const pauseDuration = Date.now() - pauseTs.current;
        pausedAccum.current += pauseDuration;
        setTotalPausedMs(prev => prev + pauseDuration);
        setSessionState('drilling');
        startTimer();

        const pausedSec = Math.floor(pauseDuration / 1000);
        const pf = `${pad(pausedSec / 60)}:${pad(pausedSec % 60)}`;
        setLogEntries(prev => [...prev, {
            type: 'resume', time: fmtMs(elapsedMs),
            elapsedMs, depth: null, layer: null, pen: null, pausedFor: pf,
        }]);
    };

    const handleLogDepth = (isLayerChange = false) => {
        if (sessionState === 'idle') { msgApi.warning('Start the session first.'); return; }
        const val = parseFloat(depthInput);
        if (isNaN(val) || val < 0) { msgApi.error('Enter a valid depth (≥ 0).'); return; }

        const prevEntry  = depthEntries[depthEntries.length - 1];
        const prevDepth  = prevEntry?.depth ?? 0;
        const prevMs     = prevEntry?.elapsedMs ?? 0;
        const deltaDepth = val - prevDepth;
        const deltaMins  = (elapsedMs - prevMs) / 60000;

        let pen: string | null = null;
        if (deltaMins > 0 && deltaDepth > 0) {
            pen = (deltaDepth / deltaMins).toFixed(2);
            setLastPen(pen);
        }

        setLogEntries(prev => [...prev, {
            type: isLayerChange ? 'layer' : 'depth',
            time: fmtMs(elapsedMs), elapsedMs,
            depth: val,
            layer: activeLayerIdx != null ? LAYER_PRESETS[activeLayerIdx].name : null,
            pen,
        }]);
        setDepthInput('');
        msgApi.success(`Depth ${val.toFixed(1)} m logged`);
    };

    const handleComplete = () => {
        stopTimer();
        setSessionState('done');
        msgApi.success(`Hole ${holeId} completed at ${(currentDepth ?? 0).toFixed(1)} m`);
        onComplete?.({
            holeId, finalDepth: currentDepth ?? 0, designDepth,
            netDrillMs: elapsedMs, totalPauseMs: totalPausedMs, entries: logEntries,
        });
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div style={{ background: token.colorBgLayout, padding: 0 }}>
            {contextHolder}

            <HoleHeader
                holeName={holeId} patternName={patternName} rigId={rigId}
                siteName={siteName} rowCol={rowCol} designDepth={designDepth} state={sessionState}
            />

            {/* ── Progress bar ── */}
            <div style={{
                padding: '10px 20px 8px',
                background: token.colorBgElevated,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Depth progress</Text>
                    <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                        {currentDepth != null ? currentDepth.toFixed(1) : '0.0'} / {designDepth.toFixed(1)} m
                    </Text>
                </div>
                <Progress
                    percent={parseFloat(progressPct.toFixed(1))}
                    showInfo={false}
                    strokeColor={progressPct >= 100 ? token.colorSuccess : token.colorPrimary}
                    trailColor={token.colorFillSecondary}
                    style={{ marginBottom: 6 }}
                />
            </div>

            {/* ── Body ── */}
            <Row gutter={0} style={{ minHeight: 500 }}>

                {/* Left: drill controls */}
                <Col
                    xs={24} md={16}
                    style={{
                        padding: 20,
                        borderRight: `1px solid ${token.colorBorderSecondary}`,
                        background: token.colorBgContainer,
                    }}
                >
                    {/* Timer + state buttons */}
                    <Space align="center" size={16} style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                        <Title
                            level={2}
                            style={{
                                margin: 0,
                                fontFamily: 'monospace',
                                minWidth: 120,
                                letterSpacing: '0.04em',
                                color: sessionState === 'paused' ? token.colorWarning : token.colorText,
                            }}
                        >
                            {fmtMs(elapsedMs)}
                        </Title>

                        {sessionState === 'idle' && (
                            <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={handleStart}>
                                Start Drilling
                            </Button>
                        )}
                        {sessionState === 'drilling' && (
                            <Button
                                size="large" icon={<PauseOutlined />} onClick={handlePause}
                                style={{ borderColor: token.colorWarning, color: token.colorWarning }}
                            >
                                Pause (Rig Change)
                            </Button>
                        )}
                        {sessionState === 'paused' && (
                            <Space wrap>
                                <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={handleResume}>
                                    Resume
                                </Button>
                                <Tag color="warning" style={{ fontSize: 12, padding: '4px 10px' }}>
                                    ⏸ Rig change in progress
                                </Tag>
                            </Space>
                        )}
                        {sessionState === 'done' && (
                            <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 13, padding: '5px 12px' }}>
                                Hole Completed
                            </Tag>
                        )}
                    </Space>

                    <Divider style={{ margin: '12px 0' }} />

                    {/* Layer selector */}
                    <LayerSelector activeIndex={activeLayerIdx} onSelect={setActiveLayerIdx} />

                    <Divider style={{ margin: '14px 0' }} />

                    {/* Depth entry */}
                    <Text
                        type="secondary"
                        style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}
                    >
                        Log Current Depth
                    </Text>
                    <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
                        <Input
                            size="large"
                            type="number"
                            placeholder="Enter depth (m)"
                            value={depthInput}
                            onChange={e => setDepthInput(e.target.value)}
                            onPressEnter={() => handleLogDepth(false)}
                            addonAfter="m"
                            style={{ fontFamily: 'monospace', fontSize: 18 }}
                            disabled={sessionState === 'idle' || sessionState === 'done'}
                        />
                        <Button
                            size="large" type="primary"
                            onClick={() => handleLogDepth(false)}
                            disabled={sessionState === 'idle' || sessionState === 'done'}
                        >
                            Log ↓
                        </Button>
                    </Space.Compact>

                    <Button
                        block size="middle"
                        onClick={() => handleLogDepth(true)}
                        disabled={sessionState === 'idle' || sessionState === 'done'}
                        style={{ marginBottom: 16 }}
                    >
                        + Mark Layer Change
                    </Button>

                    {(sessionState === 'drilling' || sessionState === 'paused') && (
                        <Button
                            block size="large" type="primary" ghost
                            icon={<CheckCircleOutlined />}
                            onClick={handleComplete}
                            style={{ borderColor: token.colorSuccess, color: token.colorSuccess }}
                        >
                            ✓ Complete Hole
                        </Button>
                    )}
                </Col>

                {/* Right: stats + log */}
                <Col
                    xs={24} md={8}
                    style={{
                        padding: 20,
                        background: token.colorBgLayout,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                    }}
                >
                    {/* Quick stat cards */}
                    <Row gutter={8}>
                        <Col span={12}>
                            <Card size="small" style={{ textAlign: 'center' }}>
                                <Statistic
                                    title="Net Drill Time"
                                    value={fmtMs(elapsedMs)}
                                    valueStyle={{ fontFamily: 'monospace', fontSize: 18, color: token.colorText }}
                                />
                            </Card>
                        </Col>
                        <Col span={12}>
                            <Card size="small" style={{ textAlign: 'center' }}>
                                <Statistic
                                    title="Avg Pen. Speed"
                                    value={avgPen ?? '—'}
                                    suffix={avgPen ? 'm/min' : ''}
                                    valueStyle={{ fontFamily: 'monospace', fontSize: 18, color: token.colorPrimary }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <SessionStats
                        elapsedMs={elapsedMs}
                        totalPausedMs={totalPausedMs}
                        currentDepth={currentDepth}
                        designDepth={designDepth}
                        avgPen={avgPen}
                        lastPen={lastPen}
                        activeLayer={activeLayerIdx != null ? LAYER_PRESETS[activeLayerIdx].name : null}
                    />

                    {/* Depth log */}
                    <Card
                        size="small"
                        title={
                            <Text
                                type="secondary"
                                style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                            >
                                Depth Log
                            </Text>
                        }
                        style={{ flex: 1, overflow: 'auto', maxHeight: 320 }}
                        styles={{ body: { overflowY: 'auto', maxHeight: 280 } }}
                    >
                        <DepthLog entries={logEntries} />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DrillSession;