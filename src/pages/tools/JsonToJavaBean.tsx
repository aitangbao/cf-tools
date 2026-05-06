import { useState } from 'react';
import { Card, Input, Button, Typography, Row, Col, Checkbox, message } from 'antd';
import { CodeOutlined, CopyOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface ClassDef {
    name: string;
    fields: FieldDef[];
}

interface FieldDef {
    name: string;
    javaName: string;
    javaType: string;
    jsonKey: string;
}

function toPascalCase(str: string): string {
    const s = str.replace(/[^a-zA-Z0-9]/g, '_');
    return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

function toCamelCase(str: string): string {
    const pascal = toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function inferType(value: unknown, key: string, className: string, nestedClasses: ClassDef[]): string {
    if (value === null) return 'Object';
    if (typeof value === 'boolean') return 'Boolean';
    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            return value >= -2147483648 && value <= 2147483647 ? 'Integer' : 'Long';
        }
        return 'Double';
    }
    if (typeof value === 'string') return 'String';
    if (Array.isArray(value)) {
        if (value.length === 0) return 'List<Object>';
        const elemType = inferType(value[0], key, className, nestedClasses);
        return `List<${elemType}>`;
    }
    if (typeof value === 'object') {
        const nestedName = className + toPascalCase(key);
        parseObject(value as Record<string, unknown>, nestedName, nestedClasses);
        return nestedName;
    }
    return 'Object';
}

function parseObject(obj: Record<string, unknown>, className: string, nestedClasses: ClassDef[]) {
    // 避免重复生成同名类
    if (nestedClasses.find(c => c.name === className)) return;

    const fields: FieldDef[] = [];
    for (const [key, value] of Object.entries(obj)) {
        const javaName = toCamelCase(key);
        const javaType = inferType(value, key, className, nestedClasses);
        fields.push({ name: key, javaName, javaType, jsonKey: key });
    }
    nestedClasses.push({ name: className, fields });
}

function generateJavaCode(
    nestedClasses: ClassDef[],
    useData: boolean,
    useBuilder: boolean,
    useNoArgsConstructor: boolean,
    useAllArgsConstructor: boolean
): string {
    const imports = new Set<string>();
    if (useData) imports.add('lombok.Data');
    if (useBuilder) imports.add('lombok.Builder');
    if (useNoArgsConstructor) imports.add('lombok.NoArgsConstructor');
    if (useAllArgsConstructor) imports.add('lombok.AllArgsConstructor');

    const hasList = nestedClasses.some(c => c.fields.some(f => f.javaType.startsWith('List<')));
    if (hasList) imports.add('java.util.List');

    const importLines = Array.from(imports).sort().map(i => `import ${i};`).join('\n');

    const generateClass = (cls: ClassDef): string => {
        const annotations = [];
        if (useData) annotations.push('@Data');
        if (useBuilder) annotations.push('@Builder');
        if (useNoArgsConstructor) annotations.push('@NoArgsConstructor');
        if (useAllArgsConstructor) annotations.push('@AllArgsConstructor');
        const annoLines = annotations.length > 0 ? annotations.join('\n') + '\n' : '';

        const fieldLines = cls.fields.map(f => {
            return `    private ${f.javaType} ${f.javaName};`;
        }).join('\n');

        return `${annoLines}public class ${cls.name} {
${fieldLines}
}`;
    };

    const sortedClasses = [...nestedClasses];
    const classBodies = sortedClasses.map(generateClass).join('\n\n');

    return `${importLines}\n\n${classBodies}`;
}

export default function JsonToJavaBean() {
    useAutoTrackVisit('JSON转JavaBean');

    const [jsonInput, setJsonInput] = useState('');
    const [className, setClassName] = useState('User');
    const [useData, setUseData] = useState(true);
    const [useBuilder, setUseBuilder] = useState(false);
    const [useNoArgsConstructor, setUseNoArgsConstructor] = useState(true);
    const [useAllArgsConstructor, setUseAllArgsConstructor] = useState(false);
    const [output, setOutput] = useState('');

    const handleGenerate = () => {
        if (!jsonInput.trim()) {
            message.warning('请输入 JSON');
            return;
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(jsonInput);
        } catch {
            message.error('JSON 解析失败，请检查格式');
            return;
        }

        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            message.error('目前仅支持 JSON 对象（{}），不支持纯数组');
            return;
        }

        const nestedClasses: ClassDef[] = [];
        parseObject(parsed as Record<string, unknown>, className, nestedClasses);

        // 根类放在最前面
        const rootIndex = nestedClasses.findIndex(c => c.name === className);
        if (rootIndex > -1) {
            const root = nestedClasses.splice(rootIndex, 1)[0];
            nestedClasses.unshift(root);
        }

        const code = generateJavaCode(nestedClasses, useData, useBuilder, useNoArgsConstructor, useAllArgsConstructor);
        setOutput(code);
        message.success('生成成功');
    };

    const handleCopy = () => {
        if (!output) {
            message.warning('暂无内容可复制');
            return;
        }
        navigator.clipboard.writeText(output);
        message.success('已复制到剪贴板');
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                <CodeOutlined /> JSON 转 Java Bean
            </Title>
            <Paragraph>
                输入 JSON，自动生成带 Lombok 注解的 Java POJO 代码
            </Paragraph>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <Card title="输入 JSON" size="small">
                        <TextArea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder={`{\n  "id": 1,\n  "name": "张三",\n  "age": 25,\n  "createTime": "2024-01-01T00:00:00"\n}`}
                            rows={12}
                        />
                        <Input
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            placeholder="类名"
                            style={{ marginTop: '8px' }}
                            addonBefore="类名"
                        />
                        <div style={{ marginTop: '12px' }}>
                            <Checkbox checked={useData} onChange={(e) => setUseData(e.target.checked)}>
                                @Data
                            </Checkbox>
                            <Checkbox checked={useBuilder} onChange={(e) => setUseBuilder(e.target.checked)}>
                                @Builder
                            </Checkbox>
                            <Checkbox checked={useNoArgsConstructor} onChange={(e) => setUseNoArgsConstructor(e.target.checked)}>
                                @NoArgsConstructor
                            </Checkbox>
                            <Checkbox checked={useAllArgsConstructor} onChange={(e) => setUseAllArgsConstructor(e.target.checked)}>
                                @AllArgsConstructor
                            </Checkbox>
                        </div>
                        <Button type="primary" onClick={handleGenerate} block style={{ marginTop: '12px' }}>
                            生成代码
                        </Button>
                    </Card>
                </Col>
                <Col xs={24} md={14}>
                    {output && (
                        <Card title="生成结果" size="small"
                            extra={
                                <Button icon={<CopyOutlined />} onClick={handleCopy} size="small">
                                    复制
                                </Button>
                            }
                        >
                            <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto', maxHeight: '600px' }}>
                                {output}
                            </pre>
                        </Card>
                    )}
                </Col>
            </Row>
        </div>
    );
}
