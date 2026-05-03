import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    Button, Card, Col, Divider, InputNumber, Popconfirm, Progress, Row,
    Slider, Space, Tag, Tooltip, Typography, message, theme
} from 'antd';
import {
    CaretRightOutlined, CheckCircleOutlined, DeleteOutlined,
    EditOutlined, PauseOutlined, ThunderboltOutlined, HistoryOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { useToken } = theme;

// ─── Types & Mongolian Layer Definitions ─────────────────────────────────────

type SessionState = 'idle' | 'drilling' | 'paused' | 'done';

export interface LogEntry {
    id: string;
    type: 'depth' | 'layer';
    time: string;
    elapsedMs: number;
    depth: number;
    layer: string;
}

const LAYER_PRESETS = [
    { name: 'Hooson chuluu', label: 'Хоосон чулуулаг', icon: '🟧', color: '#d48806' },
    { name: 'Elsen chuluu', label: 'Элсэн чулуу', icon: '🟨', color: '#a89030' },
    { name: 'Shavar', label: 'Шавар', icon: '🟤', color: '#8c6a3f' },
    { name: 'Nuurs', label: 'Нүүрс', icon: '⬛', color: '#262626' },
    { name: 'Zavsar uye', label: 'Завсар үе', icon: '🟩', color: '#389e0d' },
    { name: 'Shavran chuluu', label: 'Шавран чулуу', icon: '🔴', color: '#cf1322' },
    { name: 'Hatuu chuluu', label: 'Хатуу чулуулаг', icon: '⬜', color: '#434343' },
    { name: 'Us', label: 'Ус', icon: '💧', color: '#0284c7' },
];

const DEFAULT_LAYER_LABEL = 'Хоосон чулуулаг';

// ─── Visualizer ─────────────────────────────────────────────────────────────

const HoleProfile = ({ entries, designDepth, sliderDepth }: { entries: LogEntry[], designDepth: number, sliderDepth: number }) => {
    const { token } = useToken();

    const layerMarkers = useMemo(() => {
        return [...entries]
            .filter(e => e.type === 'layer')
            .sort((a, b) => a.depth - b.depth);
    }, [entries]);

    // Хэрэв өрөмдлөгийн гүн төлөвлөсөн гүнээс давбал графикийн масштабыг сунгана
    const maxLoggedDepth = entries.length > 0 ? Math.max(...entries.map(e => e.depth)) : 0;
    const maxViewDepth = Math.max(designDepth, maxLoggedDepth, sliderDepth, 1);

    return (
        <div style={{ 
            display: 'flex', 
            height: '550px', 
            padding: '10px 0', 
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            overflow: 'hidden' // Гадагш хлихаас сэргийлнэ
        }}>
            {/* Гүний хэмжээс (Axis) */}
            <div style={{ 
                width: '45px', 
                position: 'relative', 
                borderRight: `2px solid ${token.colorBorderSecondary}`,
                marginRight: '10px'
            }}>
                {[...Array(Math.ceil(maxViewDepth) + 1).keys()].map(m => (
                    <div key={m} style={{
                        position: 'absolute', 
                        top: `${(m / maxViewDepth) * 100}%`, 
                        right: '8px',
                        fontSize: '10px', 
                        color: token.colorTextSecondary,
                        transform: 'translateY(-50%)',
                        transition: 'top 0.3s ease'
                    }}>
                        {m}m
                    </div>
                ))}
            </div>

            {/* Цооногийн зүсэлт */}
            <div style={{
                flex: 1,
                background: token.colorFillSecondary,
                position: 'relative',
                border: `1px solid ${token.colorBorder}`,
                borderRadius: '4px',
                overflow: 'hidden'
            }}>
                {/* Эхний давхарга (0-ээс эхний бүртгэл хүртэл) */}
                {(layerMarkers.length === 0 || layerMarkers[0].depth > 0) && (
                    <div style={{
                        position: 'absolute', top: 0,
                        height: `${((layerMarkers[0]?.depth || sliderDepth) / maxViewDepth) * 100}%`,
                        width: '100%', 
                        background: '#d48806', 
                        borderBottom: '1px solid rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold'
                    }}>
                        {((layerMarkers[0]?.depth || sliderDepth) / maxViewDepth) * 100 > 8 && "Хоосон чулуулаг"}
                    </div>
                )}

                {/* Бүртгэгдсэн давхаргууд */}
                {layerMarkers.map((marker, idx) => {
                    const startDepth = marker.depth;
                    const nextMarker = layerMarkers[idx + 1];
                    const endDepth = nextMarker ? nextMarker.depth : Math.max(sliderDepth, startDepth);
                    
                    if (endDepth <= startDepth) return null;

                    const topPct = (startDepth / maxViewDepth) * 100;
                    const heightPct = ((endDepth - startDepth) / maxViewDepth) * 100;
                    const preset = LAYER_PRESETS.find(p => p.label === marker.layer);

                    return (
                        <Tooltip key={marker.id} title={`${marker.layer}: ${startDepth}м - ${endDepth}м`}>
                            <div style={{
                                position: 'absolute', 
                                top: `${topPct}%`, 
                                height: `${heightPct}%`, 
                                width: '100%',
                                background: preset?.color || '#bfbfbf', 
                                borderBottom: '1px solid rgba(255,255,255,0.2)',
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                overflow: 'hidden',
                                transition: 'all 0.3s ease',
                                color: '#fff',
                                textShadow: '0px 0px 4px rgba(0,0,0,0.5)'
                            }}>
                                {heightPct > 4 && (
                                    <>
                                        <span style={{ fontSize: '14px' }}>{preset?.icon}</span>
                                        <span style={{ fontSize: '10px', fontWeight: '500', textAlign: 'center', padding: '0 4px' }}>
                                            {marker.layer}
                                        </span>
                                    </>
                                )}
                            </div>
                        </Tooltip>
                    );
                })}

                {/* Одоогийн өрөмдөж буй заагч (Drill Pointer) */}
                <div style={{
                    position: 'absolute',
                    top: `${(sliderDepth / maxViewDepth) * 100}%`,
                    width: '100%',
                    height: '2px',
                    background: token.colorError,
                    zIndex: 10,
                    boxShadow: '0 0 8px rgba(255,0,0,0.5)',
                    transition: 'top 0.2s ease'
                }}>
                    <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '-18px',
                        background: token.colorError,
                        color: 'white',
                        fontSize: '10px',
                        padding: '1px 4px',
                        borderRadius: '2px'
                    }}>
                        {sliderDepth}m
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DrillSession({
    holeId = 'H-012',
    designDepth = 15.0,
    initialData = null,
    onComplete = (data: any) => console.log("Hole Complete:", data)
}: any) {
    const { token } = useToken();
    const [msgApi, contextHolder] = message.useMessage();

    const [state, setState] = useState<SessionState>(initialData ? 'done' : 'idle');
    const [elapsedMs, setElapsedMs] = useState(initialData?.netDrillMs || 0);
    const [totalPausedMs, setTotalPausedMs] = useState(initialData?.totalPausedMs || 0);
    const [logEntries, setLogEntries] = useState<LogEntry[]>(initialData?.entries || []);

    const [sliderDepth, setSliderDepth] = useState(initialData?.finalDepth || 0);

    // Анхны утгыг "Хоосон чулуулаг" болгож тохируулсан
    const [activeLayer, setActiveLayer] = useState<string>(DEFAULT_LAYER_LABEL);

    const timerRef = useRef<any>(null);
    const startTs = useRef(0);
    const pauseStartTs = useRef(0);

    const maxLoggedDepth = useMemo(() =>
        logEntries.length > 0 ? Math.max(...logEntries.map(e => e.depth)) : 0
        , [logEntries]);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startTimer = () => {
        startTs.current = Date.now() - elapsedMs;
        timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTs.current), 1000);
    };

    const stopTimer = () => clearInterval(timerRef.current);

    useEffect(() => {
        return () => stopTimer();
    }, []);

    const handlePause = () => {
        stopTimer();
        pauseStartTs.current = Date.now();
        setState('paused');
    };

    const handleResume = () => {
        const pauseDuration = Date.now() - pauseStartTs.current;
        setTotalPausedMs((prev: any) => prev + pauseDuration);
        setState('drilling');
        startTimer();
    };

    const handleCompleteHole = () => {
        let finalPausedMs = totalPausedMs;
        if (state === 'paused') {
            finalPausedMs += (Date.now() - pauseStartTs.current);
        }

        stopTimer();
        setState('done');

        if (onComplete) {
            onComplete({
                holeId,
                finalDepth: Math.max(maxLoggedDepth, sliderDepth),
                netDrillMs: elapsedMs,
                totalPausedMs: finalPausedMs,
                entries: logEntries,
                completedAt: new Date().toISOString()
            });
            msgApi.success("Цооногийн мэдээлэл хадгалагдлаа.");
        }
    };

    const addLog = (type: 'depth' | 'layer', targetDepth: number) => {
        if (type === 'depth' && targetDepth <= maxLoggedDepth) {
            msgApi.error(`Гүн ${maxLoggedDepth}м-ээс их байх ёстой!`);
            return;
        }

        const newEntry: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            elapsedMs,
            depth: targetDepth,
            layer: activeLayer // default: Хоосон чулуулаг
        };

        setLogEntries(prev => [...prev, newEntry]);
        msgApi.success(`${type === 'layer' ? 'Үе өөрчлөгдлөө' : 'Гүн бүртгэгдлээ'}: ${targetDepth}м`);
    };

    return (
        <div style={{ padding: '24px', background: token.colorBgLayout, minHeight: '100vh' }}>
            {contextHolder}
            <Row gutter={24}>
                <Col span={16}>
                    <Card style={{ marginBottom: 16 }}>
                        <Row justify="space-between" align="middle">
                            <Space direction="vertical" size={0}>
                                <Title level={4} style={{ margin: 0 }}>Цооног: {holeId}</Title>
                                <Text type="secondary">Зорилтот гүн: {designDepth}м</Text>
                            </Space>

                            <Space direction="vertical" align="center">
                                <Title level={2} style={{ margin: 0, fontFamily: 'monospace' }}>
                                    {formatTime(elapsedMs)}
                                </Title>
                                <Text type="danger" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                    ЗОГСОЛТ: {formatTime(totalPausedMs)}
                                </Text>
                            </Space>

                            <Space>
                                {state === 'idle' && <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={() => { setState('drilling'); startTimer(); }}>Өрөмдөж эхлэх</Button>}
                                {state === 'drilling' && <Button danger size="large" icon={<PauseOutlined />} onClick={handlePause}>Түр зогсоох</Button>}
                                {state === 'paused' && <Button type="primary" size="large" icon={<CaretRightOutlined />} onClick={handleResume}>Үргэлжлүүлэх</Button>}

                                <Popconfirm
                                    title="Дуусгах уу?"
                                    onConfirm={handleCompleteHole}
                                    okText="Тийм"
                                    cancelText="Үгүй"
                                >
                                    <Button type="primary" size="large" disabled={state === 'done'}>Дуусгах</Button>
                                </Popconfirm>
                            </Space>
                        </Row>
                    </Card>

                    <Card title="Хөрсний үе давхарга" size="small" style={{ marginBottom: 16 }}>
                        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                            {LAYER_PRESETS.map(l => (
                                <Col span={6} key={l.name}>
                                    <Button
                                        block size="small"
                                        type={activeLayer === l.label ? 'primary' : 'default'}
                                        onClick={() => setActiveLayer(l.label)}
                                    >
                                        {l.icon} {l.label}
                                    </Button>
                                </Col>
                            ))}
                        </Row>
                        <Row gutter={12} align="bottom">
                            <Col span={12}>
                                <Text type="secondary" style={{ fontSize: '11px' }}>ҮЕ ӨӨРЧЛӨГДСӨН ГҮН (м)</Text>
                                <InputNumber
                                    style={{ width: '100%' }}
                                    value={sliderDepth}
                                    onChange={v => setSliderDepth(v || 0)}
                                    step={0.1}
                                />
                            </Col>
                            <Col span={12}>
                                <Button
                                    block type="primary" ghost icon={<HistoryOutlined />}
                                    onClick={() => addLog('layer', sliderDepth)}
                                >
                                    Давхаргыг бүртгэх
                                </Button>
                            </Col>
                        </Row>
                    </Card>

                    <Card title="Өрөмдлөгийн явц" size="small" style={{ marginBottom: 16 }}>
                        <Slider min={0} max={Math.max(designDepth, 25)} step={0.1} value={sliderDepth} onChange={setSliderDepth} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                                <Button onClick={() => setSliderDepth((prev: any) => +(prev + 0.1).toFixed(1))}>+0.1м</Button>
                                <Button onClick={() => setSliderDepth((prev: any) => +(prev + 0.5).toFixed(1))}>+0.5м</Button>
                                <Button onClick={() => setSliderDepth((prev: any) => +(prev + 1.0).toFixed(1))}>+1.0м</Button>
                            </Space>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '10px', color: token.colorError, marginBottom: '4px', visibility: sliderDepth <= maxLoggedDepth ? 'visible' : 'hidden' }}>
                                    {maxLoggedDepth}м-ээс их байх ёстой
                                </div>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<ThunderboltOutlined />}
                                    onClick={() => addLog('depth', sliderDepth)}
                                    disabled={state !== 'drilling' || sliderDepth <= maxLoggedDepth}
                                >
                                    Гүн бүртгэх: {sliderDepth}м
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card title="Түүх" size="small">
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {logEntries.slice().reverse().map(e => (
                                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                                    <Space size="middle">
                                        <Text type="secondary" style={{ width: '60px' }}>{e.time}</Text>
                                        <Tag color={e.type === 'layer' ? 'orange' : 'blue'}>{e.type === 'layer' ? 'ҮЕ' : 'ГҮН'}</Tag>
                                        <Text strong>{e.depth.toFixed(1)}м</Text>
                                        <Text>{e.layer}</Text>
                                    </Space>
                                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => setLogEntries(prev => prev.filter(i => i.id !== e.id))} />
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>

                <Col span={8}>
                    <Card title="Цооногийн зүсэлт">
                        <HoleProfile entries={logEntries} designDepth={designDepth} sliderDepth={sliderDepth} />
                        <div style={{ marginTop: 16, textAlign: 'center' }}>
                            <Progress percent={Math.round((sliderDepth / designDepth) * 100)} status={state === 'drilling' ? 'active' : 'normal'} />
                            <Text strong>Одоогийн гүн: {sliderDepth}м</Text>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}