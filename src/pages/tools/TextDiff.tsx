import { useState, useMemo } from 'react';
import { Card, Input, Typography, Row, Col } from 'antd';
import { DiffOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface DiffLine {
    type: 'same' | 'remove' | 'add';
    oldLine?: string;
    newLine?: string;
    oldLineNo?: number;
    newLineNo?: number;
}

function lcs(a: string[], b: string[]): string[] {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    const result: string[] = [];
    let i = m;
    let j = n;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            result.unshift(a[i - 1]);
            i--;
            j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }
    return result;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const lcsLines = lcs(oldLines, newLines);

    const result: DiffLine[] = [];
    let i = 0;
    let j = 0;
    let k = 0;

    while (i < oldLines.length || j < newLines.length) {
        const oldVal = i < oldLines.length ? oldLines[i] : undefined;
        const newVal = j < newLines.length ? newLines[j] : undefined;
        const lcsVal = k < lcsLines.length ? lcsLines[k] : undefined;

        if (oldVal === lcsVal && newVal === lcsVal && lcsVal !== undefined) {
            result.push({
                type: 'same',
                oldLine: oldVal,
                newLine: newVal,
                oldLineNo: i + 1,
                newLineNo: j + 1,
            });
            i++;
            j++;
            k++;
        } else if (oldVal === lcsVal && lcsVal !== undefined) {
            result.push({
                type: 'add',
                newLine: newVal!,
                newLineNo: j + 1,
            });
            j++;
        } else if (newVal === lcsVal && lcsVal !== undefined) {
            result.push({
                type: 'remove',
                oldLine: oldVal!,
                oldLineNo: i + 1,
            });
            i++;
        } else {
            if (oldVal !== undefined) {
                result.push({
                    type: 'remove',
                    oldLine: oldVal,
                    oldLineNo: i + 1,
                });
                i++;
            }
            if (newVal !== undefined) {
                result.push({
                    type: 'add',
                    newLine: newVal,
                    newLineNo: j + 1,
                });
                j++;
            }
        }
    }

    return result;
}

export default function TextDiff() {
    useAutoTrackVisit('文本比较');

    const [oldText, setOldText] = useState('');
    const [newText, setNewText] = useState('');

    const diffResult = useMemo(() => computeDiff(oldText, newText), [oldText, newText]);

    const lineHeight = '22px';

    const renderSide = (
        lines: DiffLine[],
        side: 'old' | 'new'
    ) => {
        return lines.map((line, idx) => {
            const isRemove = line.type === 'remove';
            const isAdd = line.type === 'add';
            const isSame = line.type === 'same';

            let bg = 'transparent';
            let content = '';
            let lineNo: number | undefined;

            if (side === 'old') {
                if (isRemove) {
                    bg = '#ffe6e6';
                    content = line.oldLine ?? '';
                    lineNo = line.oldLineNo;
                } else if (isSame) {
                    bg = 'transparent';
                    content = line.oldLine ?? '';
                    lineNo = line.oldLineNo;
                } else if (isAdd) {
                    bg = 'transparent';
                    content = '';
                    lineNo = undefined;
                }
            } else {
                if (isAdd) {
                    bg = '#e6f7e6';
                    content = line.newLine ?? '';
                    lineNo = line.newLineNo;
                } else if (isSame) {
                    bg = 'transparent';
                    content = line.newLine ?? '';
                    lineNo = line.newLineNo;
                } else if (isRemove) {
                    bg = 'transparent';
                    content = '';
                    lineNo = undefined;
                }
            }

            const showEmpty = content === '' && lineNo === undefined;

            return (
                <div
                    key={idx}
                    style={{
                        display: 'flex',
                        minHeight: lineHeight,
                        lineHeight: lineHeight,
                        backgroundColor: bg,
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        borderBottom: '1px solid #f0f0f0',
                    }}
                >
                    <span
                        style={{
                            width: '40px',
                            textAlign: 'right',
                            paddingRight: '8px',
                            color: '#999',
                            userSelect: 'none',
                            borderRight: '1px solid #e8e8e8',
                            flexShrink: 0,
                            backgroundColor: showEmpty ? '#fafafa' : undefined,
                        }}
                    >
                        {lineNo ?? ''}
                    </span>
                    <span
                        style={{
                            paddingLeft: '8px',
                            whiteSpace: 'pre',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1,
                            backgroundColor: showEmpty
                                ? 'repeating-linear-gradient(45deg, #fafafa, #fafafa 5px, #f0f0f0 5px, #f0f0f0 10px)'
                                : undefined,
                        }}
                    >
                        {content}
                    </span>
                </div>
            );
        });
    };

    const stats = diffResult
        ? {
              same: diffResult.filter((d) => d.type === 'same').length,
              remove: diffResult.filter((d) => d.type === 'remove').length,
              add: diffResult.filter((d) => d.type === 'add').length,
          }
        : null;

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                <DiffOutlined /> 文本比较
            </Title>
            <Paragraph>比较两个文本并查看它们之间的差异</Paragraph>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Card title="旧文本" size="small">
                        <TextArea
                            value={oldText}
                            onChange={(e) => setOldText(e.target.value)}
                            placeholder="在此处粘贴旧文本..."
                            rows={8}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card title="新文本" size="small">
                        <TextArea
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                            placeholder="在此处粘贴新文本..."
                            rows={8}
                        />
                    </Card>
                </Col>
            </Row>

            {stats && (
                <div style={{ marginTop: '16px', marginBottom: '12px' }}>
                    <span style={{ marginRight: '16px' }}>
                        相同: <strong>{stats.same}</strong> 行
                    </span>
                    <span style={{ marginRight: '16px', color: '#cf1322' }}>
                        删除: <strong>{stats.remove}</strong> 行
                    </span>
                    <span style={{ color: '#389e0d' }}>
                        新增: <strong>{stats.add}</strong> 行
                    </span>
                </div>
            )}

            {
                <Row gutter={[0, 0]} style={{ border: '1px solid #e8e8e8', borderRadius: '4px', overflow: 'hidden' }}>
                    <Col xs={24} md={12}>
                        <div
                            style={{
                                background: '#fafafa',
                                padding: '8px',
                                borderBottom: '1px solid #e8e8e8',
                                textAlign: 'center',
                                fontWeight: 'bold',
                            }}
                        >
                            旧文本
                        </div>
                        <div style={{ maxHeight: '600px', overflow: 'auto' }}>{renderSide(diffResult, 'old')}</div>
                    </Col>
                    <Col xs={24} md={12}>
                        <div
                            style={{
                                background: '#fafafa',
                                padding: '8px',
                                borderBottom: '1px solid #e8e8e8',
                                borderLeft: '1px solid #e8e8e8',
                                textAlign: 'center',
                                fontWeight: 'bold',
                            }}
                        >
                            新文本
                        </div>
                        <div style={{ maxHeight: '600px', overflow: 'auto' }}>{renderSide(diffResult, 'new')}</div>
                    </Col>
                </Row>
            }
        </div>
    );
}

