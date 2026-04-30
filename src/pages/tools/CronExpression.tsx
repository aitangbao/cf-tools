import { useState } from 'react';
import { Card, Input, Button, Typography, message, Table, Tag, Row, Col } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { Title, Paragraph, Text } = Typography;

function parseCronField(field: string, min: number, max: number): number[] {
    const values = new Set<number>();
    const parts = field.split(',');

    for (const part of parts) {
        if (part === '*') {
            for (let i = min; i <= max; i++) values.add(i);
        } else if (part.includes('/')) {
            const [range, stepStr] = part.split('/');
            const step = parseInt(stepStr, 10);
            const start = range === '*' ? min : parseInt(range, 10);
            const end = range === '*' ? max : (range.includes('-') ? parseInt(range.split('-')[1], 10) : max);
            for (let i = start; i <= end; i += step) {
                if (i >= min && i <= max) values.add(i);
            }
        } else if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            for (let i = start; i <= end; i++) {
                if (i >= min && i <= max) values.add(i);
            }
        } else {
            const val = parseInt(part, 10);
            if (!isNaN(val) && val >= min && val <= max) values.add(val);
        }
    }

    return Array.from(values).sort((a, b) => a - b);
}

function getNextExecutions(expression: string, count: number): Date[] {
    const fields = expression.trim().split(/\s+/);
    if (fields.length !== 5) {
        throw new Error('Cron 表达式必须是 5 个字段：分 时 日 月 周');
    }

    const minutes = parseCronField(fields[0], 0, 59);
    const hours = parseCronField(fields[1], 0, 23);
    const daysOfMonth = parseCronField(fields[2], 1, 31);
    const months = parseCronField(fields[3], 1, 12);
    const daysOfWeek = parseCronField(fields[4], 0, 7);

    // 星期 0 和 7 都代表周日
    const dowSet = new Set(daysOfWeek);
    if (dowSet.has(0)) dowSet.add(7);
    if (dowSet.has(7)) dowSet.add(0);
    const daysOfWeekFinal = Array.from(dowSet).sort((a, b) => a - b);

    const results: Date[] = [];
    const now = new Date();
    // 从当前时间开始，逐分钟搜索
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);

    // 最多搜索未来 4 年，防止无限循环
    const maxSearch = new Date(cursor.getTime());
    maxSearch.setFullYear(maxSearch.getFullYear() + 4);

    while (results.length < count && cursor <= maxSearch) {
        cursor.setMinutes(cursor.getMinutes() + 1);

        const m = cursor.getMinutes();
        const h = cursor.getHours();
        const dom = cursor.getDate();
        const mon = cursor.getMonth() + 1;
        const dow = cursor.getDay();

        if (
            minutes.includes(m) &&
            hours.includes(h) &&
            months.includes(mon) &&
            daysOfMonth.includes(dom) &&
            daysOfWeekFinal.includes(dow)
        ) {
            results.push(new Date(cursor.getTime()));
        }
    }

    return results;
}

function formatDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

const examples = [
    { expr: '0 0 L * *', desc: '每月的最后1天执行' },
    { expr: '* * * * *', desc: '每1分钟执行一次' },
    { expr: '*/10 * * * *', desc: '每隔10分钟执行一次' },
    { expr: '0 */1 * * *', desc: '每隔1小时执行一次' },
    { expr: '30 21 * * *', desc: '每晚的21:30执行' },
    { expr: '3,15 * * * *', desc: '每小时的第3和第15分钟执行' },
    { expr: '3,15 8-11 * * *', desc: '在上午8点到11点的第3和第15分钟执行' },
];

const serviceCommands = [
    { cmd: 'service crond start', desc: '启动服务' },
    { cmd: 'service crond stop', desc: '关闭服务' },
    { cmd: 'service crond restart', desc: '重启服务' },
    { cmd: 'service crond reload', desc: '重新载入配置' },
    { cmd: 'service crond status', desc: '查看服务状态' },
];

const crontabCommands = [
    { cmd: 'crontab -l', desc: '查看crontab' },
    { cmd: 'crontab -e', desc: '编辑crontab' },
    { cmd: 'crontab -r', desc: '删除crontab' },
];

export default function CronExpression() {
    useAutoTrackVisit('Cron表达式解析器');

    const [input, setInput] = useState('0 */6 * * *');
    const [executions, setExecutions] = useState<Date[]>([]);
    const [loading, setLoading] = useState(false);

    const handleGenerate = () => {
        if (!input.trim()) {
            message.warning('请输入 Cron 表达式');
            return;
        }
        setLoading(true);
        try {
            const results = getNextExecutions(input.trim(), 10);
            setExecutions(results);
            if (results.length === 0) {
                message.info('未找到未来执行时间，请检查表达式');
            } else {
                message.success(`已生成 ${results.length} 条执行时间`);
            }
        } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : '解析失败，请检查表达式格式');
        } finally {
            setLoading(false);
        }
    };

    const handleUseExample = (expr: string) => {
        setInput(expr);
        setExecutions([]);
    };

    const columns = [
        {
            title: '序号',
            dataIndex: 'index',
            key: 'index',
            width: 80,
            render: (_: unknown, __: unknown, idx: number) => idx + 1,
        },
        {
            title: '预计执行时间',
            dataIndex: 'time',
            key: 'time',
            render: (_: unknown, record: Date) => formatDateTime(record),
        },
        {
            title: '距今',
            dataIndex: 'diff',
            key: 'diff',
            render: (_: unknown, record: Date) => {
                const diff = record.getTime() - Date.now();
                if (diff < 0) return '已执行';
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const parts: string[] = [];
                if (days > 0) parts.push(`${days}天`);
                if (hours > 0) parts.push(`${hours}小时`);
                if (mins > 0) parts.push(`${mins}分钟`);
                return parts.length > 0 ? parts.join('') : '即将执行';
            },
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}><ClockCircleOutlined /> Cron 表达式解析器</Title>
            <Paragraph>
                输入 Cron 表达式，快速计算未来执行时间，验证表达式是否正确
            </Paragraph>

            <Card style={{ marginBottom: '16px' }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={18} md={16}>
                        <Text strong>Cron 表达式：</Text>
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="例如：0 */6 * * *"
                            style={{ marginTop: '8px' }}
                            onPressEnter={handleGenerate}
                        />
                    </Col>
                    <Col xs={24} sm={6} md={8}>
                        <Button type="primary" onClick={handleGenerate} loading={loading} block>
                            生成执行时间
                        </Button>
                    </Col>
                </Row>
                <Paragraph type="secondary" style={{ marginTop: '12px', fontSize: '12px' }}>
                    提示：标准 Cron 为 5 字段（分 时 日 月 周），如 <Text code>0 */6 * * *</Text> 表示每 6 小时执行一次
                </Paragraph>
            </Card>

            {executions.length > 0 && (
                <Card title="未来执行时间" style={{ marginBottom: '16px' }}>
                    <Table
                        dataSource={executions}
                        columns={columns}
                        rowKey={(_, idx) => idx!.toString()}
                        pagination={false}
                        size="small"
                    />
                </Card>
            )}

            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Card title="Cron 表达式说明" size="small">
                        <pre style={{ fontSize: '12px', lineHeight: '1.6', background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
{`* * * * *  [command]
│ │ │ │ │
│ │ │ │ └── 星期 (0 - 7, Sunday=0 or 7)
│ │ │ └──── 月 (1 - 12)
│ │ └────── 日 (1 - 31)
│ └──────── 时 (0 - 23)
└────────── 分 (0 - 59)`}
                        </pre>
                        <div style={{ marginTop: '12px' }}>
                            <Tag color="blue">*</Tag> <Text type="secondary">表示任意值</Text><br />
                            <Tag color="blue">,</Tag> <Text type="secondary">表示列表，如 1,3,5</Text><br />
                            <Tag color="blue">-</Tag> <Text type="secondary">表示范围，如 1-5</Text><br />
                            <Tag color="blue">/</Tag> <Text type="secondary">表示步长，如 */10</Text>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card title="常用示例" size="small">
                        {examples.map((ex) => (
                            <div key={ex.expr} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Tag color="cyan" style={{ cursor: 'pointer' }} onClick={() => handleUseExample(ex.expr)}>
                                    {ex.expr}
                                </Tag>
                                <Text type="secondary" style={{ fontSize: '12px' }}>{ex.desc}</Text>
                            </div>
                        ))}
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                <Col xs={24} md={12}>
                    <Card title="cron 服务操作命令" size="small">
                        <pre style={{ fontSize: '12px', lineHeight: '1.8', background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                            {serviceCommands.map(c => `${c.cmd}  #${c.desc}`).join('\n')}
                        </pre>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card title="crontab 命令" size="small">
                        <pre style={{ fontSize: '12px', lineHeight: '1.8', background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                            {crontabCommands.map(c => `${c.cmd}  #${c.desc}`).join('\n')}
                        </pre>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
