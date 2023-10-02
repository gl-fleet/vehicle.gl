import { React, Table, Typography, Collapse, Button } from 'uweb'
import { FolderOutlined, ReloadOutlined } from '@ant-design/icons'

const { useEffect, useState } = React
const { Title, Text } = Typography

export default ({ io: { io }, event }: iArgs) => {

    const [list, setList] = useState({ loading: false, data: [] })
    const getList = () => setList(() => {

        io.poll('get-chunks-distinct', {}, (e: any, data: []) => setList({ loading: false, data: data ?? [] }))
        return { loading: true, data: [] }

    })

    useEffect(() => {
        getList()
    }, [])

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
            render: ({ type, name }: any) => <Button size={'small'} onClick={() => event.emit(type, name)} style={{ display: 'block', margin: 'auto' }}>Open</Button>
        },
    ]

    return <Collapse items={[

        {
            key: '1',
            label: 'Design Files',
            extra: <ReloadOutlined onClick={(e: any) => { getList(); e.stopPropagation(); }} />,
            children: <Table rowKey={'name'} loading={list.loading} dataSource={list.data ?? []} columns={columns} size={'small'} />
        },
        {
            key: '2',
            label: 'Fatigue Settings',
            children: <Text type="warning">Permission denied!</Text>,
        },
        {
            key: '3',
            label: 'Configuration',
            children: <Text type="warning">Permission denied!</Text>,
        },

    ]} bordered={false} defaultActiveKey={['1']} />

}