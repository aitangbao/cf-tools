import { useState } from 'react';
import { Card, Input, Button, Typography, message, Table, Tag, Row, Col } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { Title, Paragraph, Text } = Typography;

type CronField =
    | { kind: 'any' }
    | { kind: 'unspecified' }
    | { kind: 'lastDay' }
    | { kind: 'values'; values: number[] };

interface ParsedCronExpression {
    seconds: CronField;
    minutes: CronField;
    hours: CronField;
    daysOfMonth: CronField;
    months: CronField;
    daysOfWeek: CronField;
    years?: CronField;
}

interface ParseFieldOptions {
    allowQuestionMark?: boolean;
    allowLastDay?: boolean;
    normalizeValue?: (value: number) => number;
}

function parseCronField(field: string, min: number, max: number, options: ParseFieldOptions = {}): CronField {
    const normalizedField = field.trim();

    if (normalizedField === '*') {
        return { kind: 'any' };
    }

    if (options.allowQuestionMark && normalizedField === '?') {
        return { kind: 'unspecified' };
    }

    if (options.allowLastDay && normalizedField === 'L') {
        return { kind: 'lastDay' };
    }

    const normalizeValue = options.normalizeValue ?? ((value: number) => value);
    const values = new Set<number>();
    const parts = normalizedField.split(',');

    for (const rawPart of parts) {
        const part = rawPart.trim();
        if (!part) {
            continue;
        }

        if (part.includes('/')) {
            const [base, stepStr] = part.split('/');
            const step = parseInt(stepStr, 10);
            if (!step || Number.isNaN(step) || step <= 0) {
                throw new Error(`无效的步长字段：${part}`);
            }

            let start = min;
            let end = max;

            if (base && base !== '*') {
                if (base.includes('-')) {
                    const [rangeStart, rangeEnd] = base.split('-').map(Number);
                    start = rangeStart;
                    end = rangeEnd;
                } else {
                    start = parseInt(base, 10);
                }
            }

            if (Number.isNaN(start) || Number.isNaN(end)) {
                throw new Error(`无效的范围字段：${part}`);
            }

            for (let i = start; i <= end; i += step) {
                if (i >= min && i <= max) {
                    values.add(normalizeValue(i));
                }
            }
            continue;
        }

        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (Number.isNaN(start) || Number.isNaN(end)) {
                throw new Error(`无效的范围字段：${part}`);
            }
            for (let i = start; i <= end; i++) {
                if (i >= min && i <= max) {
                    values.add(normalizeValue(i));
                }
            }
            continue;
        }

        const value = parseInt(part, 10);
        if (Number.isNaN(value)) {
            throw new Error(`无效的字段：${part}`);
        }
        if (value >= min && value <= max) {
            values.add(normalizeValue(value));
        }
    }

    if (values.size === 0) {
        throw new Error(`字段超出允许范围：${field}`);
    }

    return { kind: 'values', values: Array.from(values).sort((a, b) => a - b) };
}

function parseCronExpression(expression: string): ParsedCronExpression {
    const fields = expression.trim().split(/\s+/);

    if (fields.length === 5) {
        const [minutes, hours, daysOfMonth, months, daysOfWeek] = fields;
        return {
            seconds: { kind: 'values', values: [0] },
            minutes: parseCronField(minutes, 0, 59),
            hours: parseCronField(hours, 0, 23),
            daysOfMonth: parseCronField(daysOfMonth, 1, 31, { allowLastDay: true, allowQuestionMark: true }),
            months: parseCronField(months, 1, 12),
            daysOfWeek: parseCronField(daysOfWeek, 0, 7, { allowQuestionMark: true, normalizeValue: (value) => value === 7 ? 0 : value }),
        };
    }

    if (fields.length === 6 || fields.length === 7) {
        const [seconds, minutes, hours, daysOfMonth, months, daysOfWeek, years] = fields;
        return {
            seconds: parseCronField(seconds, 0, 59),
            minutes: parseCronField(minutes, 0, 59),
            hours: parseCronField(hours, 0, 23),
            daysOfMonth: parseCronField(daysOfMonth, 1, 31, { allowLastDay: true, allowQuestionMark: true }),
            months: parseCronField(months, 1, 12),
            daysOfWeek: parseCronField(daysOfWeek, 0, 7, { allowQuestionMark: true, normalizeValue: (value) => value === 7 ? 0 : value }),
            years: years ? parseCronField(years, 1970, 2099) : undefined,
        };
    }

    throw new Error('Cron 表达式必须是 5 个字段，或 Quartz 风格的 6/7 个字段');
}

function isDayFieldRestricted(field: CronField): boolean {
    return field.kind === 'values' || field.kind === 'lastDay';
}

function matchesField(field: CronField, value: number, date: Date): boolean {
    if (field.kind === 'any' || field.kind === 'unspecified') {
        return true;
    }

    if (field.kind === 'lastDay') {
        return value === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }

    return field.values.includes(value);
}

function getNextExecutions(expression: string, count: number): Date[] {
    const parsed = parseCronExpression(expression);
    const results: Date[] = [];
    const now = new Date();
    const cursor = new Date(now.getTime() + 1000);
    cursor.setMilliseconds(0);

    const maxSearch = new Date(cursor.getTime());
    maxSearch.setFullYear(maxSearch.getFullYear() + 4);

    while (results.length < count && cursor <= maxSearch) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth() + 1;
        const dayOfMonth = cursor.getDate();
        const dayOfWeek = cursor.getDay();
        const hour = cursor.getHours();
        const minute = cursor.getMinutes();
        const second = cursor.getSeconds();

        if (parsed.years && !matchesField(parsed.years, year, cursor)) {
            cursor.setFullYear(year + 1, 0, 1);
            cursor.setHours(0, 0, 0, 0);
            continue;
        }

        if (!matchesField(parsed.months, month, cursor)) {
            cursor.setMonth(cursor.getMonth() + 1, 1);
            cursor.setHours(0, 0, 0, 0);
            continue;
        }

        const dayOfMonthMatches = matchesField(parsed.daysOfMonth, dayOfMonth, cursor);
        const dayOfWeekMatches = matchesField(parsed.daysOfWeek, dayOfWeek, cursor);
        const dayOfMonthRestricted = isDayFieldRestricted(parsed.daysOfMonth);
        const dayOfWeekRestricted = isDayFieldRestricted(parsed.daysOfWeek);

        let dayMatches = true;
        if (dayOfMonthRestricted && dayOfWeekRestricted) {
            dayMatches = dayOfMonthMatches || dayOfWeekMatches;
        } else if (dayOfMonthRestricted) {
            dayMatches = dayOfMonthMatches;
        } else if (dayOfWeekRestricted) {
            dayMatches = dayOfWeekMatches;
        }

        if (!dayMatches) {
            cursor.setDate(cursor.getDate() + 1);
            cursor.setHours(0, 0, 0, 0);
            continue;
        }

        if (!matchesField(parsed.hours, hour, cursor)) {
            cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
            continue;
        }

        if (!matchesField(parsed.minutes, minute, cursor)) {
            cursor.setMinutes(cursor.getMinutes() + 1, 0, 0);
            continue;
        }

        if (!matchesField(parsed.seconds, second, cursor)) {
            cursor.setSeconds(cursor.getSeconds() + 1, 0);
            continue;
        }

        results.push(new Date(cursor.getTime()));
        cursor.setSeconds(cursor.getSeconds() + 1, 0);
    }

    return results;
}

function formatDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

const examples = [
    { expr: '0 0 L * *', desc: '每月最后一天的 00:00 执行' },
    { expr: '* * * * *', desc: '每 1 分钟执行一次' },
    { expr: '*/10 * * * *', desc: '每隔 10 分钟执行一次' },
    { expr: '0 */1 * * *', desc: '每隔 1 小时执行一次' },
    { expr: '30 21 * * *', desc: '每天 21:30 执行' },
    { expr: '3,15 * * * *', desc: '每小时的第 3 和第 15 分钟执行' },
    { expr: '3,15 8-11 * * *', desc: '上午 8 点到 11 点的第 3 和第 15 分钟执行' },
    { expr: '0 0 2 1/5 * ?', desc: 'Quartz：每月从 1 号开始每隔 5 天的 02:00:00 执行' },
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
                            placeholder="例如：0 */6 * * * 或 0 0 2 1/5 * ?"
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
                    提示：支持标准 Cron 5 字段（分 时 日 月 周）和 Quartz 6/7 字段（秒 分 时 日 月 周 [年]），如 <Text code>0 */6 * * *</Text>、<Text code>0 0 2 1/5 * ?</Text>
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
{`标准 Cron：* * * * *  [command]
           │ │ │ │ │
           │ │ │ │ └── 星期 (0 - 7, Sunday=0 or 7)
           │ │ │ └──── 月 (1 - 12)
           │ │ └────── 日 (1 - 31, 支持 L)
           │ └──────── 时 (0 - 23)
           └────────── 分 (0 - 59)

Quartz：    * * * * * *
           │ │ │ │ │ │
           │ │ │ │ │ └── 星期 (0 - 7, 支持 ?)
           │ │ │ │ └──── 月 (1 - 12)
           │ │ │ └────── 日 (1 - 31, 支持 L / ?)
           │ │ └──────── 时 (0 - 23)
           │ └────────── 分 (0 - 59)
           └──────────── 秒 (0 - 59)`}
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
