import { useState, useRef, useCallback } from 'react';
import { Card, Input, Button, Typography, message, Row, Col, Modal } from 'antd';
import { CopyOutlined, DownloadOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

export default function Base64FileConverter() {
    useAutoTrackVisit('Base64文件转换器');

    // Base64 to file
    const [fileName, setFileName] = useState('file');
    const [extension, setExtension] = useState('');
    const [base64Input, setBase64Input] = useState('');
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');

    // File to base64
    const [base64Output, setBase64Output] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // File to Base64
    const handleFileToBase64 = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            setBase64Output(result);
            message.success(`已转换：${file.name}`);
        };
        reader.onerror = () => {
            message.error('文件读取失败');
        };
        reader.readAsDataURL(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileToBase64(file);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileToBase64(file);
        }
    }, []);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleCopyOutput = () => {
        if (!base64Output) {
            message.warning('暂无内容可复制');
            return;
        }
        navigator.clipboard.writeText(base64Output);
        message.success('已复制到剪贴板');
    };

    // Base64 to File
    const getMimeType = (ext: string): string => {
        const map: Record<string, string> = {
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            webp: 'image/webp',
            svg: 'image/svg+xml',
            pdf: 'application/pdf',
            txt: 'text/plain',
            json: 'application/json',
            html: 'text/html',
            js: 'application/javascript',
            css: 'text/css',
            zip: 'application/zip',
            mp3: 'audio/mpeg',
            mp4: 'video/mp4',
        };
        return map[ext.toLowerCase()] || 'application/octet-stream';
    };

    const parseBase64 = (input: string): { mime: string; data: string } | null => {
        const trimmed = input.trim();
        if (trimmed.startsWith('data:')) {
            const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                return { mime: match[1], data: match[2] };
            }
        }
        // 纯 base64 字符串
        if (/^[A-Za-z0-9+/=]+$/.test(trimmed)) {
            const ext = extension.trim() || 'bin';
            return { mime: getMimeType(ext), data: trimmed };
        }
        return null;
    };

    const handleDownload = () => {
        if (!base64Input.trim()) {
            message.warning('请输入 Base64 内容');
            return;
        }
        const parsed = parseBase64(base64Input);
        if (!parsed) {
            message.error('Base64 格式不正确');
            return;
        }
        try {
            const byteCharacters = atob(parsed.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: parsed.mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ext = extension.trim() || parsed.mime.split('/')[1] || 'bin';
            a.download = `${fileName.trim() || 'file'}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            message.success('文件下载已开始');
        } catch {
            message.error('解码失败，请检查 Base64 内容');
        }
    };

    const handlePreview = () => {
        if (!base64Input.trim()) {
            message.warning('请输入 Base64 内容');
            return;
        }
        const parsed = parseBase64(base64Input);
        if (!parsed) {
            message.error('Base64 格式不正确');
            return;
        }
        if (!parsed.mime.startsWith('image/')) {
            message.info('当前内容不是图片格式，无法预览');
            return;
        }
        try {
            const url = `data:${parsed.mime};base64,${parsed.data}`;
            setPreviewUrl(url);
            setPreviewVisible(true);
        } catch {
            message.error('预览失败');
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>Base64 文件转换器</Title>
            <Paragraph>
                将字符串、文件或图片转换为 Base64 编码，或从 Base64 还原为文件
            </Paragraph>

            <Row gutter={[24, 24]}>
                {/* Base64 to File */}
                <Col xs={24} md={12}>
                    <Card title="Base64 转文件" bordered>
                        <Row gutter={[8, 8]}>
                            <Col span={14}>
                                <Text type="secondary">文件名</Text>
                                <Input
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value)}
                                    placeholder="file"
                                    style={{ marginTop: '4px' }}
                                />
                            </Col>
                            <Col span={10}>
                                <Text type="secondary">扩展名</Text>
                                <Input
                                    value={extension}
                                    onChange={(e) => setExtension(e.target.value)}
                                    placeholder="如 png, pdf..."
                                    style={{ marginTop: '4px' }}
                                />
                            </Col>
                        </Row>

                        <div style={{ marginTop: '12px' }}>
                            <TextArea
                                value={base64Input}
                                onChange={(e) => setBase64Input(e.target.value)}
                                placeholder="在此处粘贴 Base64 内容..."
                                rows={8}
                            />
                        </div>

                        <Row gutter={[8, 8]} style={{ marginTop: '12px' }} justify="center">
                            <Col>
                                <Button icon={<EyeOutlined />} onClick={handlePreview}>
                                    预览图片
                                </Button>
                            </Col>
                            <Col>
                                <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
                                    下载文件
                                </Button>
                            </Col>
                        </Row>
                    </Card>
                </Col>

                {/* File to Base64 */}
                <Col xs={24} md={12}>
                    <Card title="文件转 Base64" bordered>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            style={{
                                border: `2px dashed ${isDragging ? '#1890ff' : '#d9d9d9'}`,
                                borderRadius: '8px',
                                padding: '40px 24px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: isDragging ? '#e6f7ff' : '#fafafa',
                                transition: 'all 0.3s',
                            }}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />
                            <UploadOutlined style={{ fontSize: '32px', color: '#bfbfbf' }} />
                            <Paragraph style={{ marginTop: '8px', marginBottom: '4px' }}>
                                拖拽文件到此处，或点击选择文件
                            </Paragraph>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                支持图片、文档等各种格式
                            </Text>
                        </div>

                        <div style={{ marginTop: '12px' }}>
                            <TextArea
                                value={base64Output}
                                readOnly
                                placeholder="Base64 结果将显示在此处..."
                                rows={8}
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </div>

                        <Row justify="center" style={{ marginTop: '12px' }}>
                            <Button icon={<CopyOutlined />} onClick={handleCopyOutput} disabled={!base64Output}>
                                复制结果
                            </Button>
                        </Row>
                    </Card>
                </Col>
            </Row>

            {/* 图片预览 Modal */}
            <Modal
                open={previewVisible}
                title="图片预览"
                footer={null}
                onCancel={() => setPreviewVisible(false)}
                centered
            >
                {previewUrl && (
                    <img
                        src={previewUrl}
                        alt="preview"
                        style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
                    />
                )}
            </Modal>
        </div>
    );
}
