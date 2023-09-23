import { React, Layout, Typography, Row, Col, Timeline } from 'uweb'
import { log } from 'utils/web'

const { useEffect, useState } = React
const { Title, Text } = Typography

export default ({ io, event, isDarkMode }: iArgs) => {

    const [info, setInfo] = useState('...')

    useEffect(() => {

        setInfo('open')

        console.log('open')
        const listen = (sms: string) => log.info(sms)
        event.on('none', listen)

        return () => {
            console.log('close')
            event.off('none', listen)
        }

    }, [])

    return <Layout style={{ padding: '16px 12px' }}>
        <Text>{info}</Text>
    </Layout>

}