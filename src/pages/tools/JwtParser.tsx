import { useState, useMemo } from 'react';
import { Card, Input, Typography, Table, Tag } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

function base64UrlDecode(input: string): string {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLength);
    try {
        return decodeURIComponent(
            atob(padded)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
    } catch {
        return atob(padded);
    }
}

interface JwtPart {
    raw: string;
    json: Record<string, unknown>;
}

interface ParseResult {
    header: JwtPart | null;
    payload: JwtPart | null;
    signature: string;
    valid: boolean;
    error?: string;
}

function parseJwt(token: string): ParseResult {
    const trimmed = token.trim();
    if (!trimmed) {
        return { header: null, payload: null, signature: '', valid: false };
    }

    const parts = trimmed.split('.');
    if (parts.length !== 3) {
        return { header: null, payload: null, signature: '', valid: false, error: 'JWT 必须由三部分组成（header.payload.signature）' };
    }

    try {
        const headerJson = JSON.parse(base64UrlDecode(parts[0]));
        const payloadJson = JSON.parse(base64UrlDecode(parts[1]));
        return {
            header: { raw: parts[0], json: headerJson },
            payload: { raw: parts[1], json: payloadJson },
            signature: parts[2],
            valid: true,
        };
    } catch {
        return { header: null, payload: null, signature: '', valid: false, error: '解码失败，请检查 JWT 格式' };
    }
}

const headerLabels: Record<string, string> = {
    alg: 'Algorithm',
    typ: 'Type',
    kid: 'Key ID',
    cty: 'Content Type',
};

const payloadLabels: Record<string, string> = {
    iss: 'Issuer',
    sub: 'Subject',
    aud: 'Audience',
    exp: 'Expiration Time',
    nbf: 'Not Before',
    iat: 'Issued At',
    jti: 'JWT ID',
    name: 'Full name',
    given_name: 'Given name',
    family_name: 'Family name',
    middle_name: 'Middle name',
    nickname: 'Nickname',
    preferred_username: 'Preferred username',
    profile: 'Profile URL',
    picture: 'Picture URL',
    website: 'Website URL',
    email: 'Email',
    email_verified: 'Email verified',
    gender: 'Gender',
    birthdate: 'Birthdate',
    zoneinfo: 'Zone info',
    locale: 'Locale',
    phone_number: 'Phone number',
    phone_number_verified: 'Phone number verified',
    address: 'Address',
    updated_at: 'Updated at',
    azp: 'Authorized party',
    scope: 'Scope',
    roles: 'Roles',
    permissions: 'Permissions',
};

function isTimestampField(key: string, value: unknown): boolean {
    return (key === 'exp' || key === 'iat' || key === 'nbf' || key === 'updated_at') && typeof value === 'number';
}

function formatValue(key: string, value: unknown): string {
    if (isTimestampField(key, value)) {
        const date = new Date((value as number) * 1000);
        return `${value}  (${date.toLocaleString('zh-CN')})`;
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}

function buildTableData(json: Record<string, unknown>, labels: Record<string, string>) {
    return Object.entries(json).map(([key, value]) => ({
        key,
        label: labels[key] || '',
        value: formatValue(key, value),
        isTimestamp: isTimestampField(key, value),
    }));
}

export default function JwtParser() {
    useAutoTrackVisit('JWT解析器');

    const [input, setInput] = useState('');

    const result = useMemo(() => parseJwt(input), [input]);

    const headerData = result.header ? buildTableData(result.header.json, headerLabels) : [];
    const payloadData = result.payload ? buildTableData(result.payload.json, payloadLabels) : [];

    const columns = [
        {
            title: '字段',
            dataIndex: 'key',
            key: 'key',
            width: '25%',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: '含义',
            dataIndex: 'label',
            key: 'label',
            width: '30%',
            render: (text: string) => text ? <Text type="secondary">({text})</Text> : null,
        },
        {
            title: '值',
            dataIndex: 'value',
            key: 'value',
            render: (text: string, record: { isTimestamp: boolean }) =>
                record.isTimestamp ? <Tag color="blue">{text}</Tag> : <Text>{text}</Text>,
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}><SafetyOutlined /> JWT 解析器</Title>
            <Paragraph>
                解析和解码 JSON Web Token（JWT）并显示其内容
            </Paragraph>

            <Card title="JWT to decode" style={{ marginBottom: '16px' }}>
                <TextArea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="在此处粘贴 JWT 字符串..."
                    rows={5}
                />
                {result.error && (
                    <Paragraph type="danger" style={{ marginTop: '8px' }}>
                        {result.error}
                    </Paragraph>
                )}
            </Card>

            {result.valid && (
                <Card>
                    {headerData.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                                <Text strong style={{ fontSize: '16px' }}>Header</Text>
                            </div>
                            <Table
                                dataSource={headerData}
                                columns={columns}
                                pagination={false}
                                size="small"
                                bordered
                                rowKey="key"
                            />
                        </div>
                    )}

                    {payloadData.length > 0 && (
                        <div>
                            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                                <Text strong style={{ fontSize: '16px' }}>Payload</Text>
                            </div>
                            <Table
                                dataSource={payloadData}
                                columns={columns}
                                pagination={false}
                                size="small"
                                bordered
                                rowKey="key"
                            />
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
