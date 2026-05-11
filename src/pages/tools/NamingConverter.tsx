import { useState, useMemo } from 'react';
import { Card, Input, Typography, message, Row, Col, Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';


const { Title, Paragraph, Text } = Typography;

interface NamingFormats {
    camelCase: string;
    PascalCase: string;
    snake_case: string;
    SNAKE_CASE: string;
    kebab_case: string;
}

function convertNaming(input: string): NamingFormats {
    if (!input.trim()) {
        return { camelCase: '', PascalCase: '', snake_case: '', SNAKE_CASE: '', kebab_case: '' };
    }

    const words = input
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .split(/[^a-zA-Z0-9]+/)
        .filter(w => w.length > 0)
        .map(w => w.toLowerCase());

    if (words.length === 0) {
        return { camelCase: '', PascalCase: '', snake_case: '', SNAKE_CASE: '', kebab_case: '' };
    }

    const camelCase = words
        .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
        .join('');

    const PascalCase = words
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join('');

    const snake_case = words.join('_');
    const SNAKE_CASE = words.join('_').toUpperCase();
    const kebab_case = words.join('-');

    return { camelCase, PascalCase, snake_case, SNAKE_CASE, kebab_case };
}

export default function NamingConverter() {
    useAutoTrackVisit('命名转换器');

    const [input, setInput] = useState('');

    const formats = useMemo(() => convertNaming(input), [input]);

    const handleCopy = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        message.success(`已复制 ${label}`);
    };

    const formatItems = [
        { key: 'camelCase', label: '驼峰命名法 (camelCase)', value: formats.camelCase },
        { key: 'PascalCase', label: '大驼峰命名法 (PascalCase)', value: formats.PascalCase },
        { key: 'snake_case', label: '下划线小写 (snake_case)', value: formats.snake_case },
        { key: 'SNAKE_CASE', label: '下划线大写 (SNAKE_CASE)', value: formats.SNAKE_CASE },
        { key: 'kebab_case', label: '短横线小写 (kebab-case)', value: formats.kebab_case },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>命名转换器</Title>
            <Paragraph>
                输入任意文本，自动转换为常见的编程命名规范格式
            </Paragraph>

            <Card title="输入原文" style={{ marginBottom: '16px' }}>
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="请输入要转换的原文，例如：hello world、hello-world、hello_world、HelloWorld..."
                />
            </Card>

            <Card title="转换结果">
                <Row gutter={[16, 16]}>
                    {formatItems.map((item) => (
                        <Col key={item.key} xs={24} sm={12}>
                            <Text strong>{item.label}</Text>
                            <Row gutter={[8, 8]} align="middle" style={{ marginTop: '4px' }}>
                                <Col flex="auto">
                                    <Input
                                        value={item.value}
                                        readOnly
                                        style={{ backgroundColor: '#f5f5f5' }}
                                    />
                                </Col>
                                <Col>
                                    <Button
                                        icon={<CopyOutlined />}
                                        onClick={() => handleCopy(item.value, item.label)}
                                        disabled={!item.value}
                                    >
                                        复制
                                    </Button>
                                </Col>
                            </Row>
                        </Col>
                    ))}
                </Row>
            </Card>
        </div>
    );
}
