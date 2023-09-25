import { React, Table, Typography, Collapse } from 'uweb'
import { FolderOutlined, ReloadOutlined } from '@ant-design/icons'
import { log } from 'utils/web'

const { useEffect, useState } = React
const { Title, Text } = Typography

export default ({ io: { io }, event, isDarkMode }: iArgs) => {

    const [list, setList] = useState({ loading: false, data: [] })
    const getList = () => setList(() => {
        io.pull('get-chunks-distinct', {}, (e: any, data: []) => setList({ loading: false, data: data ?? [] }))
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
            render: ({ type, name }: any) => <Text key="enter" onClick={() => event.emit(type, name)} style={{ display: 'block', textAlign: 'center' }}>Open</Text>
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
            label: 'This is panel header 2',
            children: <Text>OK</Text>,
        },
    ]} bordered={false} defaultActiveKey={['1']} />

}