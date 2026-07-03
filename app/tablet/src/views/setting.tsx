import { React, Table, Form, Row, Col, Typography, Collapse, Input, Select, Button } from 'uweb'
import { FolderOutlined, ReloadOutlined } from '@ant-design/icons'

const { useEffect, useState, useMemo } = React
const { Title, Text } = Typography

const Configure = ({ pm2, event }: iArgs) => {

    const [did, setDid]: any = useState(false)
    const [load, setLoad]: any = useState(0)
    const [cfg, setCfg]: any = useState({
        'gps.offset': { loading: 1, value: null, changed: null },
        'gps.host': { loading: 1, value: null, changed: null },
    })

    useEffect(() => {


        pm2.get('env_get', { name: 'gps' }).then((v: any) => {
            console.log(typeof v)
            console.log(v)
            console.log(JSON.parse(v))
        })

        pm2.get('env_get', { name: 'gps', field: 'offset' }).then(v => {
            console.log(v)
            setCfg((e: any) => ({ ...e, 'gps.offset': { ...e['gps.offset'], value: v, loading: 0 } }))
        }).catch((e) => {
            console.log(e)
            setCfg((e: any) => ({ ...e, 'gps.offset': { ...e['gps.offset'], loading: 2 } }))
        })

        pm2.get('env_get', { name: 'gps', field: 'host' }).then(v => {
            console.log(v)
            setCfg((e: any) => ({ ...e, 'gps.host': { ...e['gps.host'], value: v, loading: 0 } }))
        }).catch((e) => {
            console.log(e)
            setCfg((e: any) => ({ ...e, 'gps.host': { ...e['gps.host'], loading: 2 } }))
        })

    }, [])

    const onChange = (arg: any) => {

        const key = arg[0].name[0]
        const [name, field, value] = [...key.split('.'), arg[0].value]

        console.log({ key, name, field, value })

        setCfg((e: any) => ({ ...e, [key]: { ...e[key], changed: { name, field, value } } }))

    }

    const apply = (key = '') => {

        setCfg((e: any) => ({ ...e, [key]: { ...e[key], loading: 1 } }))

        pm2.get('env_set', { ...cfg[key].changed }).then(v => {

            console.log(v)
            pm2.get('env_apply', { name: key.split('.')[0] }).then(v => {

                console.log(v)
                setCfg((e: any) => ({ ...e, [key]: { ...e[key], loading: 0, changed: null } }))

            }).catch(e => {

                console.log(e)
                setCfg((e: any) => ({ ...e, [key]: { ...e[key], loading: 2, changed: null } }))

            })

        }).catch(e => {

            console.log(e)
            setCfg((e: any) => ({ ...e, [key]: { ...e[key], loading: 2, changed: null } }))

        })

    }

    const onPersist = () => {
        setLoad(1)
        pm2.get('save', {})
            .then(() => setLoad(0))
            .catch(() => setLoad(2))

    }

    const loads = Object.keys(cfg).reduce((sum: number, cur: any) => (sum + (cfg[cur].loading === 1 ? 1 : 0)), 0)
    const sets = Object.keys(cfg).reduce((sum: number, cur: any) => (sum + (cfg[cur].changed === null ? 0 : 1)), 0)

    useEffect(() => { loads === 0 && setDid(true) }, [loads])

    return did === false ? 'loading' : <Form
        name="config"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        initialValues={{
            'gps.offset': cfg['gps.offset'].value,
            'gps.host': cfg['gps.host'].value,
        }}
        onFieldsChange={onChange}
    >

        {/** BoomDrill: Ri, Fr, Do, BRi, C1, C2, C3, C4 */}
        <Form.Item label="GPS Calibration" extra={`Format: gps_dist, to_front, to_right, to_top, expand`}>
            <Row gutter={8}>
                <Col span={16}>
                    <Form.Item name="gps.offset" noStyle >
                        <Input disabled={true} />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Button
                        loading={cfg['gps.offset'].loading === 1}
                        danger={cfg['gps.offset'].loading === 2}
                        // disabled={cfg['gps.offset'].changed === null}
                        disabled={true}
                        onClick={() => apply('gps.offset')}>Set</Button>
                </Col>
            </Row>
        </Form.Item>

        <Form.Item label="NTRIP" extra="Set will trigger the GPS service to restart!">
            <Row gutter={8}>
                <Col span={16}>
                    <Form.Item name="gps.host" noStyle >
                        <Select options={[
                            { label: 'Ukhaa Khudag', value: '139.59.115.158,2101' },
                            { label: 'Baruun Naran', value: '139.59.115.158,2102' },
                            { label: 'Bayan Khundii', value: '139.59.115.158,2103' },
                        ]} />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Button
                        loading={cfg['gps.host'].loading === 1}
                        danger={cfg['gps.host'].loading === 2}
                        disabled={cfg['gps.host'].changed === null}
                        onClick={() => apply('gps.host')}>Set</Button>
                </Col>
            </Row>
        </Form.Item>

        <Form.Item label={'Persist the changes'}>
            <Button
                type="primary"
                loading={load}
                danger={load === 2}
                disabled={sets > 0}
                onClick={() => onPersist()}>Save</Button>
        </Form.Item>

    </Form>

}

export default (cfg: iArgs) => {

    const { api, pm2, cloud, event } = cfg

    const [list, setList] = useState({ loading: false, data: [] })

    const fileList = () => setList(() => {

        (cloud ?? api).poll('get-chunks-distinct', {}, (e: any, data: []) => {

            setList({ loading: false, data: data ?? [] })

        })

        return { loading: true, data: [] }

    })

    useEffect(() => fileList(), [])

    const columns = [
        {
            title: '',
            render: () => <Text style={{ display: 'block', textAlign: 'center' }}><FolderOutlined /></Text>
        },
        {
            title: 'Name',
            dataIndex: 'name',
            render: (e: string) => <Text>{e}</Text>
        },
        {
            title: 'Type',
            dataIndex: 'type',
            render: (e: string) => <Text>{e}</Text>
        },
        {
            title: 'Chunks',
            dataIndex: 'count',
            render: (e: string) => <Text>{e}</Text>
        },
        {
            title: 'From',
            dataIndex: 'src',
            render: (e: string) => <Text>{e}</Text>
        },
        {
            title: 'To',
            dataIndex: 'dst',
            render: (e: string) => <Text>{e}</Text>
        },
        {
            title: '',
            render: ({ type, name }: any) => <Button
                style={{ display: 'block', margin: 'auto' }}
                size={'small'}
                onClick={() => event.emit(type, name)}
            >Open</Button>
        },
    ]

    return <Collapse items={[

        {
            key: '1',
            label: 'Design Files',
            extra: <ReloadOutlined onClick={(e: any) => { fileList(); e.stopPropagation(); }} />,
            children: <Table rowKey={'name'} loading={list.loading} dataSource={list.data ?? []} columns={columns} size={'small'} />
        },
        {
            key: '2',
            label: 'Configuration',
            children: <Configure {...cfg} />,
        },

    ]} bordered={false} defaultActiveKey={['1']} />

} 