import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Button,
    Card,
    Col,
    Divider,
    InputNumber,
    Popconfirm,
    Progress,
    Row,
    Select,
    Slider,
    Space,
    Statistic,
    Tag,
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
    DeleteOutlined,
    EditOutlined,
    PauseOutlined,
    RedoOutlined,
    SaveOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { useToken } = theme;

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionState = 'idle' | 'drilling' | 'paused' | 'done';

export interface LogEntry {
    id: string;
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
    { name: 'Overburden', mn: 'Хучлага үе', icon: '🟧', activeColor: '#d48806', activeBgLight: '#fff7e6', activeBgDark: '#3d2b00' },
    { name: 'Sandstone', mn: 'Элсэн чулуу', icon: '🟨', activeColor: '#a89030', activeBgLight: '#feffe6', activeBgDark: '#363200' },
    { name: 'Clay', mn: 'Шавар', icon: '🟤', activeColor: '#8c6a3f', activeBgLight: '#f0e8dc', activeBgDark: '#2e1e08' },
    { name: 'Coal Seam', mn: 'Нүүрсний давхарга', icon: '⬛', activeColor: '#595959', activeBgLight: '#f0f0f0', activeBgDark: '#1a1a1a' },
    { name: 'Interburden', mn: 'Давхаргын завсар үе', icon: '🟩', activeColor: '#389e0d', activeBgLight: '#f6ffed', activeBgDark: '#0d2b00' },
    { name: 'Mudstone', mn: 'Шавран чулуу', icon: '🔴', activeColor: '#cf1322', activeBgLight: '#fff1f0', activeBgDark: '#2a0005' },
    { name: 'Shale', mn: 'Занар', icon: '🔵', activeColor: '#0958d9', activeBgLight: '#e6f4ff', activeBgDark: '#001d57' },
    { name: 'Hard Rock', mn: 'Хатуу чулуулаг', icon: '⬜', activeColor: '#434343', activeBgLight: '#fafafa', activeBgDark: '#141414' },
    { name: 'Water', mn: 'Ус', icon: '💧', activeColor: '#0284c7', activeBgLight: '#e0f2fe', activeBgDark: '#082f49' },
];

const LAYER_NAMES = LAYER_PRESETS.map(l => l.name);

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _seq = 0;
function genId(): string { return `e_${Date.now()}_${++_seq}`; }

function withIds(entries: Omit<LogEntry, 'id'>[]): LogEntry[] {
    return entries.map(e => ({ id: genId(), ...e }));
}

function pad(n: number): string { return String(Math.floor(n)).padStart(2, '0'); }
function fmtMs(ms: number): string {
    const tot = Math.floor(ms / 1000);
    return `${pad(tot / 60)}:${pad(tot % 60)}`;
}

// ─── HoleHeader ───────────────────────────────────────────────────────────────

interface HoleHeaderProps {
    holeName: string; patternName: string; rigId: string;
    siteName: string; rowCol: string; designDepth: number;
    state: SessionState; isResume: boolean;
}

const HoleHeader: React.FC<HoleHeaderProps> = ({
    holeName, patternName, rigId, siteName, rowCol, designDepth, state, isResume,
}) => {
    const { token } = useToken();
    const stateConfig: Record<SessionState, { color: string; label: string }> = {
        idle: { color: 'default', label: 'Idle' },
        drilling: { color: 'success', label: '● Drilling' },
        paused: { color: 'warning', label: '⏸ Paused' },
        done: { color: 'processing', label: '✓ Done' },
    };
    const { color, label } = stateConfig[state];
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px',
            background: token.colorBgElevated,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}>
            <Space direction="vertical" size={2}>
                <Space align="center" size={8} wrap>
                    <Title level={5} style={{ margin: 0, fontFamily: 'monospace', color: token.colorText }}>
                        {holeName}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>{patternName}</Text>
                    <Tag color={color}>{label}</Tag>
                    {isResume && <Tag color="purple">Resuming saved session</Tag>}
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
    const isDark = token.colorBgContainer === '#141414';
    return (
        <div>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
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
                                        width: '100%', padding: '8px 4px',
                                        border: `${isActive ? 2 : 1}px solid ${isActive ? layer.activeColor : token.colorBorderSecondary}`,
                                        borderRadius: token.borderRadiusSM,
                                        background: isActive ? (isDark ? layer.activeBgDark : layer.activeBgLight) : token.colorBgContainer,
                                        cursor: 'pointer', fontSize: 12,
                                        color: isActive ? layer.activeColor : token.colorTextSecondary,
                                        fontWeight: isActive ? 600 : 400,
                                        textAlign: 'center', lineHeight: 1.4, transition: 'all 0.15s',
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

// ─── DepthSliderInput ─────────────────────────────────────────────────────────

interface DepthSliderInputProps {
    value: number;
    onChange: (v: number) => void;
    maxDepth: number;
    disabled: boolean;
}

const DepthSliderInput: React.FC<DepthSliderInputProps> = ({ value, onChange, maxDepth, disabled }) => {
    const { token } = useToken();

    // Build marks: every 1 m gets a label, every 0.5 m gets an unlabelled tick
    const marks: Record<number, React.ReactNode> = {};
    for (let m = 0; m <= maxDepth; m += 1) {
        marks[m] = (
            <span style={{ fontSize: 10, color: token.colorTextTertiary }}>{m}</span>
        );
    }

    return (
        <div style={{
            padding: '12px 16px 8px',
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadius,
            background: token.colorBgContainer,
        }}>
            {/* Value display + manual number input */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                        Current Depth
                    </Text>
                    <Title level={2} style={{ margin: 0, fontFamily: 'monospace', color: disabled ? token.colorTextDisabled : token.colorPrimary, lineHeight: 1 }}>
                        {value.toFixed(1)}
                        <span style={{ fontSize: 16, fontWeight: 400, color: token.colorTextSecondary, marginLeft: 4 }}>m</span>
                    </Title>
                </div>
                <InputNumber
                    size="large"
                    min={0}
                    max={maxDepth}
                    step={0.1}
                    precision={1}
                    value={value}
                    onChange={v => onChange(v ?? 0)}
                    disabled={disabled}
                    addonAfter="m"
                    style={{ width: 130, fontFamily: 'monospace' }}
                />
            </div>

            {/* Slider */}
            <Slider
                min={0}
                max={maxDepth}
                step={0.1}
                value={value}
                onChange={onChange}
                disabled={disabled}
                marks={marks}
                tooltip={{
                    formatter: (v) => `${(v ?? 0).toFixed(1)} m`,
                    placement: 'top',
                }}
                styles={{
                    track: { background: token.colorPrimary },
                    rail: { background: token.colorFillSecondary },
                }}
            />

            {/* Quick-step buttons: +0.1 … +1.0 */}
            <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                    Quick step
                </Text>
                <Space size={4} wrap>
                    {[0.1, 0.2, 0.3, 0.5, 1.0, 2.0].map(step => (
                        <Button
                            key={step}
                            size="small"
                            disabled={disabled}
                            onClick={() => onChange(Math.min(maxDepth, parseFloat((value + step).toFixed(1))))}
                        >
                            +{step}
                        </Button>
                    ))}
                </Space>
            </div>
        </div>
    );
};

// ─── EditableLogRow ───────────────────────────────────────────────────────────

interface EditableLogRowProps {
    entry: LogEntry;
    onSave: (id: string, patch: Partial<Pick<LogEntry, 'depth' | 'layer'>>) => void;
    onDelete: (id: string) => void;
}

const EditableLogRow: React.FC<EditableLogRowProps> = ({ entry, onSave, onDelete }) => {
    const { token } = useToken();
    const [editing, setEditing] = useState(false);
    const [draftDepth, setDraftDepth] = useState<number | null>(entry.depth);
    const [draftLayer, setDraftLayer] = useState<string | null>(entry.layer);

    if (entry.type === 'resume') {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px',
                background: token.colorWarningBg,
                border: `1px solid ${token.colorWarningBorder}`,
                borderRadius: token.borderRadiusSM,
                marginBottom: 4,
            }}>
                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: token.colorTextSecondary, minWidth: 38 }}>
                    {entry.time}
                </Text>
                <Tag color="warning" style={{ margin: 0 }}>▶ Resumed · paused for {entry.pausedFor}</Tag>
            </div>
        );
    }

    const handleSave = () => { onSave(entry.id, { depth: draftDepth, layer: draftLayer }); setEditing(false); };
    const handleCancel = () => { setDraftDepth(entry.depth); setDraftLayer(entry.layer); setEditing(false); };

    if (editing) {
        return (
            <div style={{
                padding: '8px 10px',
                border: `1.5px solid ${token.colorPrimaryBorder}`,
                borderRadius: token.borderRadius,
                background: token.colorPrimaryBg,
                marginBottom: 4,
            }}>
                <Row gutter={6} align="middle" wrap={false}>
                    <Col flex="38px">
                        <Text style={{ fontSize: 11, fontFamily: 'monospace', color: token.colorTextTertiary }}>{entry.time}</Text>
                    </Col>
                    <Col flex="110px">
                        <InputNumber
                            size="small" min={0} max={9999} step={0.1} precision={1}
                            value={draftDepth ?? undefined}
                            onChange={v => setDraftDepth(v ?? null)}
                            addonAfter="m"
                            style={{ width: '100%', fontFamily: 'monospace' }}
                            autoFocus onPressEnter={handleSave}
                        />
                    </Col>
                    <Col flex="auto">
                        <Select
                            size="small" allowClear placeholder="Layer…"
                            value={draftLayer ?? undefined}
                            onChange={v => setDraftLayer(v ?? null)}
                            style={{ width: '100%' }}
                            options={LAYER_NAMES.map(name => {
                                const p = LAYER_PRESETS.find(x => x.name === name)!;
                                return { value: name, label: <span>{p.icon} {name}</span> };
                            })}
                        />
                    </Col>
                    <Col flex="72px">
                        <Space size={4}>
                            <Button type="primary" size="small" icon={<SaveOutlined />} onClick={handleSave} />
                            <Button size="small" onClick={handleCancel}>✕</Button>
                        </Space>
                    </Col>
                </Row>
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 8px',
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusSM,
                background: token.colorBgContainer,
                marginBottom: 4,
                transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = token.colorPrimaryBorder)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = token.colorBorderSecondary)}
        >
            <Text style={{ fontSize: 11, fontFamily: 'monospace', color: token.colorTextTertiary, minWidth: 38 }}>
                {entry.time}
            </Text>
            <Text strong style={{ fontFamily: 'monospace', fontSize: 14, minWidth: 50, color: token.colorText }}>
                {entry.depth != null ? `${entry.depth.toFixed(1)} m` : '—'}
            </Text>
            {entry.pen
                ? <Text style={{ fontSize: 11, color: token.colorTextSecondary, flex: 1 }}>{entry.pen} m/min</Text>
                : <span style={{ flex: 1 }} />}
            <Space size={3}>
                {entry.layer && <Tag style={{ margin: 0, fontSize: 11 }}>{entry.layer}</Tag>}
                {entry.type === 'layer' && <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>layer ↓</Tag>}
            </Space>
            <Space size={2}>
                <Tooltip title="Edit">
                    <Button type="text" size="small" icon={<EditOutlined />}
                        onClick={() => setEditing(true)}
                        style={{ color: token.colorTextTertiary }} />
                </Tooltip>
                <Popconfirm title="Delete this entry?" onConfirm={() => onDelete(entry.id)}
                    okText="Delete" okButtonProps={{ danger: true }} cancelText="Cancel">
                    <Tooltip title="Delete">
                        <Button type="text" size="small" icon={<DeleteOutlined />}
                            style={{ color: token.colorTextTertiary }} />
                    </Tooltip>
                </Popconfirm>
            </Space>
        </div>
    );
};

// ─── EditableDepthLog ─────────────────────────────────────────────────────────

interface EditableDepthLogProps {
    entries: LogEntry[];
    onSave: (id: string, patch: Partial<Pick<LogEntry, 'depth' | 'layer'>>) => void;
    onDelete: (id: string) => void;
}

const EditableDepthLog: React.FC<EditableDepthLogProps> = ({ entries, onSave, onDelete }) => {
    if (entries.length === 0) {
        return (
            <Text type="secondary" style={{ fontSize: 12 }}>
                No entries yet. Start drilling and log depths.
            </Text>
        );
    }
    return (
        <div>
            <Row style={{ padding: '0 8px', marginBottom: 4 }}>
                <Col flex="38px"><Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</Text></Col>
                <Col flex="50px"><Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Depth</Text></Col>
                <Col flex="auto"><Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Speed</Text></Col>
                <Col><Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Layer</Text></Col>
            </Row>
            <Divider style={{ margin: '0 0 6px' }} />
            {[...entries].reverse().map(entry => (
                <EditableLogRow key={entry.id} entry={entry} onSave={onSave} onDelete={onDelete} />
            ))}
        </div>
    );
};

// ─── SessionStats ─────────────────────────────────────────────────────────────

interface SessionStatsProps {
    elapsedMs: number; totalPausedMs: number;
    currentDepth: number | null; designDepth: number;
    avgPen: string | null; lastPen: string | null; activeLayer: string | null;
}

const SessionStats: React.FC<SessionStatsProps> = ({
    elapsedMs, totalPausedMs, currentDepth, designDepth, avgPen, lastPen, activeLayer,
}) => {
    const { token } = useToken();
    const remaining = currentDepth != null ? Math.max(0, designDepth - currentDepth) : designDepth;
    const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0' };
    const lbl: React.CSSProperties = { fontSize: 12, color: token.colorTextSecondary };
    const val: React.CSSProperties = { fontSize: 15, fontWeight: 600, fontFamily: 'monospace', color: token.colorText };

    return (
        <Card size="small">
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                Session Stats
            </Text>
            <div style={rowStyle}>
                <span style={lbl}><ClockCircleOutlined /> Elapsed (net)</span>
                <span style={val}>{fmtMs(elapsedMs)}</span>
            </div>
            <Divider style={{ margin: '2px 0' }} />
            <div style={rowStyle}>
                <span style={lbl}><PauseOutlined /> Pause time</span>
                <span style={{ ...val, color: totalPausedMs > 0 ? token.colorWarning : token.colorText }}>{fmtMs(totalPausedMs)}</span>
            </div>
            <Divider style={{ margin: '2px 0' }} />
            <div style={rowStyle}>
                <span style={lbl}><ColumnHeightOutlined /> Current depth</span>
                <span style={val}>{currentDepth != null ? `${currentDepth.toFixed(1)} m` : '—'}</span>
            </div>
            <Divider style={{ margin: '2px 0' }} />
            <div style={rowStyle}>
                <span style={lbl}>Remaining</span>
                <span style={{ ...val, color: remaining <= 1 ? token.colorSuccess : token.colorText }}>{remaining.toFixed(1)} m</span>
            </div>
            <Divider style={{ margin: '2px 0' }} />
            <div style={rowStyle}>
                <span style={lbl}><ThunderboltOutlined /> Avg pen. speed</span>
                <span style={val}>{avgPen ? `${avgPen} m/min` : '—'}</span>
            </div>
            <Divider style={{ margin: '2px 0' }} />
            <div style={rowStyle}>
                <span style={lbl}>Last pen. speed</span>
                <span style={val}>{lastPen ? `${lastPen} m/min` : '—'}</span>
            </div>
            <Divider style={{ margin: '2px 0' }} />
            <div style={rowStyle}>
                <span style={lbl}>Active layer</span>
                <span style={{ ...val, fontSize: 12 }}>{activeLayer ?? '—'}</span>
            </div>
        </Card>
    );
};

// ─── Public types ─────────────────────────────────────────────────────────────

export interface CompleteSummary {
    holeId: string;
    finalDepth: number;
    designDepth: number;
    netDrillMs: number;
    totalPauseMs: number;
    entries: LogEntry[];
}

export interface DrillSessionProps {
    holeId?: string;
    patternName?: string;
    rigId?: string;
    siteName?: string;
    rowCol?: string;
    designDepth?: number;
    initialData?: CompleteSummary;
    onComplete?: (summary: CompleteSummary) => void;
}

// ─── DrillSession (main) ──────────────────────────────────────────────────────

const DrillSession: React.FC<DrillSessionProps> = ({
    holeId = 'H-012',
    patternName = 'Pattern P-2024-031',
    rigId = 'RIG-04',
    siteName = 'Oyut Tolgoi · Open Pit A · Block 7',
    rowCol = 'R4 C3',
    designDepth = 12.0,
    initialData,
    onComplete,
}) => {
    const { token } = useToken();
    const isResume = Boolean(initialData);

    console.log(holeId)

    // Derive a sensible slider start: last logged depth or 0
    const lastSavedDepth = initialData?.entries
        ? [...initialData.entries].reverse().find(e => e.depth != null)?.depth ?? 0
        : 0;

    const [sessionState, setSessionState] = useState<SessionState>(initialData ? 'done' : 'idle');
    const [elapsedMs, setElapsedMs] = useState(initialData?.netDrillMs ?? 0);
    const [totalPausedMs, setTotalPausedMs] = useState(initialData?.totalPauseMs ?? 0);
    const [activeLayerIdx, setActiveLayerIdx] = useState<number | null>(null);
    const [logEntries, setLogEntries] = useState<LogEntry[]>(initialData ? withIds(initialData.entries) : []);
    const [sliderDepth, setSliderDepth] = useState<number>(lastSavedDepth);
    const [lastPen, setLastPen] = useState<string | null>(null);

    const startTs = useRef<number>(0);
    const pauseTs = useRef<number>(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pausedAccum = useRef<number>(0);

    const [msgApi, contextHolder] = message.useMessage();

    // ── Timer ──────────────────────────────────────────────────────────────────

    const tick = useCallback(() => {
        setElapsedMs(Date.now() - startTs.current - pausedAccum.current);
    }, []);

    const startTimer = () => { intervalRef.current = setInterval(tick, 500); };
    const stopTimer = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
    useEffect(() => () => stopTimer(), []);

    // ── Derived ────────────────────────────────────────────────────────────────

    const depthEntries = logEntries.filter(e => e.depth != null);
    const currentDepth = depthEntries.length ? depthEntries[depthEntries.length - 1].depth : null;
    const progressPct = currentDepth != null ? Math.min(100, (currentDepth / designDepth) * 100) : 0;

    const avgPen: string | null = (() => {
        if (currentDepth == null || elapsedMs === 0) return null;
        const mins = elapsedMs / 60000;
        return mins > 0 ? (currentDepth / mins).toFixed(2) : null;
    })();

    const inputDisabled = sessionState === 'idle' || sessionState === 'done';

    // ── Session actions ────────────────────────────────────────────────────────

    const handleStart = () => {
        startTs.current = Date.now();
        pausedAccum.current = 0;
        setElapsedMs(0);
        setTotalPausedMs(0);
        setSessionState('drilling');
        startTimer();
    };

    const handleContinue = () => {
        const savedMs = initialData?.netDrillMs ?? elapsedMs;
        startTs.current = Date.now() - savedMs;
        pausedAccum.current = 0;
        setSessionState('paused');
    };

    const handlePause = () => {
        stopTimer();
        pauseTs.current = Date.now();
        setSessionState('paused');
    };

    const handleResume = () => {
        const dur = Date.now() - pauseTs.current;
        pausedAccum.current += dur;
        setTotalPausedMs(prev => prev + dur);
        setSessionState('drilling');
        startTimer();
        const pausedSec = Math.floor(dur / 1000);
        const pf = `${pad(pausedSec / 60)}:${pad(pausedSec % 60)}`;
        setLogEntries(prev => [...prev, {
            id: genId(), type: 'resume', time: fmtMs(elapsedMs),
            elapsedMs, depth: null, layer: null, pen: null, pausedFor: pf,
        }]);
    };

    const handleLogDepth = (isLayerChange = false) => {
        if (sessionState === 'idle') { msgApi.warning('Start the session first.'); return; }
        const val = sliderDepth;
        if (val < 0) { msgApi.error('Depth must be ≥ 0.'); return; }

        const prevEntry = depthEntries[depthEntries.length - 1];
        const prevDepth = prevEntry?.depth ?? 0;
        const prevMs = prevEntry?.elapsedMs ?? 0;
        const deltaDepth = val - prevDepth;
        const deltaMins = (elapsedMs - prevMs) / 60000;

        let pen: string | null = null;
        if (deltaMins > 0 && deltaDepth > 0) {
            pen = (deltaDepth / deltaMins).toFixed(2);
            setLastPen(pen);
        }

        setLogEntries(prev => [...prev, {
            id: genId(),
            type: isLayerChange ? 'layer' : 'depth',
            time: fmtMs(elapsedMs), elapsedMs,
            depth: val,
            layer: activeLayerIdx != null ? LAYER_PRESETS[activeLayerIdx].name : null,
            pen,
        }]);
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

    const handleSaveEntry = (id: string, patch: Partial<Pick<LogEntry, 'depth' | 'layer'>>) => {
        setLogEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
        msgApi.success('Entry updated');
    };
    const handleDeleteEntry = (id: string) => {
        setLogEntries(prev => prev.filter(e => e.id !== id));
        msgApi.info('Entry removed');
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div style={{ background: token.colorBgLayout, padding: 0 }}>
            {contextHolder}

            <HoleHeader
                holeName={holeId} patternName={patternName} rigId={rigId}
                siteName={siteName} rowCol={rowCol} designDepth={designDepth}
                state={sessionState} isResume={isResume}
            />

            {/* Progress */}
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
                    percent={parseFloat(progressPct.toFixed(1))} showInfo={false}
                    strokeColor={progressPct >= 100 ? token.colorSuccess : token.colorPrimary}
                    trailColor={token.colorFillSecondary}
                    style={{ marginBottom: 6 }}
                />
            </div>

            {/* Body */}
            <Row gutter={0} style={{ minHeight: 500 }}>

                {/* ── LEFT PANEL ── */}
                <Col xs={24} md={16} style={{
                    padding: 20,
                    borderRight: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgContainer,
                }}>
                    {/* Timer + state controls */}
                    <Space align="center" size={16} style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                        <Title level={2} style={{
                            margin: 0, fontFamily: 'monospace', minWidth: 120, letterSpacing: '0.04em',
                            color: sessionState === 'paused' ? token.colorWarning : token.colorText,
                        }}>
                            {fmtMs(elapsedMs)}
                        </Title>

                        {sessionState === 'idle' && (
                            <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={handleStart}>
                                Start Drilling
                            </Button>
                        )}
                        {sessionState === 'done' && isResume && (
                            <Button size="large" icon={<RedoOutlined />} onClick={handleContinue}
                                style={{ borderColor: token.colorPrimary, color: token.colorPrimary }}>
                                Continue Drilling
                            </Button>
                        )}
                        {sessionState === 'done' && !isResume && (
                            <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 13, padding: '5px 12px' }}>
                                Hole Completed
                            </Tag>
                        )}
                        {sessionState === 'drilling' && (
                            <Button size="large" icon={<PauseOutlined />} onClick={handlePause}
                                style={{ borderColor: token.colorWarning, color: token.colorWarning }}>
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
                    </Space>

                    <Divider style={{ margin: '12px 0' }} />

                    {/* Layer selector */}
                    <LayerSelector activeIndex={activeLayerIdx} onSelect={setActiveLayerIdx} />

                    <Divider style={{ margin: '14px 0' }} />

                    {/* ── Depth log (inline, between layer and log buttons) ── */}
                    <Card
                        size="small"
                        title={
                            <Space size={6}>
                                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Depth Log
                                </Text>
                                <Tag>{logEntries.filter(e => e.type !== 'resume').length} entries</Tag>
                            </Space>
                        }
                        extra={
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                <EditOutlined /> tap to edit
                            </Text>
                        }
                        style={{ marginBottom: 14 }}
                        styles={{ body: { overflowY: 'auto', maxHeight: 260, padding: '8px 12px' } }}
                    >
                        <EditableDepthLog
                            entries={logEntries}
                            onSave={handleSaveEntry}
                            onDelete={handleDeleteEntry}
                        />
                    </Card>

                    <Divider style={{ margin: '0 0 14px' }} />

                    {/* ── Depth slider input ── */}
                    <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                        Log Current Depth
                    </Text>

                    <DepthSliderInput
                        value={sliderDepth}
                        onChange={setSliderDepth}
                        maxDepth={designDepth}
                        disabled={inputDisabled}
                    />

                    <Row gutter={8} style={{ marginTop: 10 }}>
                        <Col span={12}>
                            <Button
                                block size="large" type="primary"
                                onClick={() => handleLogDepth(false)}
                                disabled={inputDisabled}
                            >
                                Log ↓
                            </Button>
                        </Col>
                        <Col span={12}>
                            <Button
                                block size="large"
                                onClick={() => handleLogDepth(true)}
                                disabled={inputDisabled}
                            >
                                + Layer Change
                            </Button>
                        </Col>
                    </Row>

                    {(sessionState === 'drilling' || sessionState === 'paused') && (
                        <Button
                            block size="large" type="primary" ghost
                            icon={<CheckCircleOutlined />}
                            onClick={handleComplete}
                            style={{ marginTop: 12, borderColor: token.colorSuccess, color: token.colorSuccess }}
                        >
                            ✓ Complete Hole
                        </Button>
                    )}
                </Col>

                {/* ── RIGHT PANEL: stats only ── */}
                <Col xs={24} md={8} style={{
                    padding: 20,
                    background: token.colorBgLayout,
                    display: 'flex', flexDirection: 'column', gap: 16,
                }}>
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
                                    title="Avg Speed"
                                    value={avgPen ?? '—'}
                                    suffix={avgPen ? 'm/min' : ''}
                                    valueStyle={{ fontFamily: 'monospace', fontSize: 18, color: token.colorPrimary }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <SessionStats
                        elapsedMs={elapsedMs} totalPausedMs={totalPausedMs}
                        currentDepth={currentDepth} designDepth={designDepth}
                        avgPen={avgPen} lastPen={lastPen}
                        activeLayer={activeLayerIdx != null ? LAYER_PRESETS[activeLayerIdx].name : null}
                    />
                </Col>
            </Row>
        </div>
    );
};

export default DrillSession;