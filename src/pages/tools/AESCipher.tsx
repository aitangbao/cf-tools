import { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, Select, Row, Col, message } from 'antd';
import { LockOutlined, UnlockOutlined, CopyOutlined, ClockCircleOutlined } from '@ant-design/icons';
import CryptoJS from 'crypto-js';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

type CipherMode = 'AES/ECB/PKCS5Padding';

/**
 * 将密钥补零到 AES 标准长度（16/24/32 字节），与 Java SecretKeySpec 行为保持一致
 */
function parseKey(key: string): any {
    const keyBytes = CryptoJS.enc.Utf8.parse(key);
    const len = keyBytes.sigBytes;
    if (len === 16 || len === 24 || len === 32) {
        return keyBytes;
    }
    const targetLen = len <= 16 ? 16 : len <= 24 ? 24 : 32;
    const zeroPad = CryptoJS.lib.WordArray.create([0], targetLen - len);
    return CryptoJS.lib.WordArray.create()
        .concat(keyBytes)
        .concat(zeroPad);
}

export default function AESCipher() {
    useAutoTrackVisit('AES加密解密');

    const [plainText, setPlainText] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [cipherText, setCipherText] = useState('');
    const [mode, setMode] = useState<CipherMode>('AES/ECB/PKCS5Padding');

    const getCryptoMode = () => {
        switch (mode) {
            case 'AES/ECB/PKCS5Padding':
                return { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 };
            default:
                return { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 };
        }
    };

    const handleEncrypt = () => {
        if (!plainText.trim()) {
            message.warning('请输入原始文本');
            return;
        }
        if (!secretKey.trim()) {
            message.warning('请输入密钥');
            return;
        }
        try {
            const keyParsed = parseKey(secretKey);
            const cfg = getCryptoMode();
            const encrypted = CryptoJS.AES.encrypt(plainText, keyParsed, cfg);
            // 只返回纯密文 Base64，不含 OpenSSL 的 salt 头
            setCipherText(encrypted.ciphertext.toString(CryptoJS.enc.Base64));
            message.success('加密成功');
        } catch {
            message.error('加密失败');
        }
    };

    const handleDecrypt = () => {
        if (!cipherText.trim()) {
            message.warning('请输入密文');
            return;
        }
        if (!secretKey.trim()) {
            message.warning('请输入密钥');
            return;
        }
        try {
            const keyParsed = parseKey(secretKey);
            const cfg = getCryptoMode();
            // 显式构造 CipherParams，避免 crypto-js 解析 OpenSSL 格式
            const cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: CryptoJS.enc.Base64.parse(cipherText)
            });
            const decrypted = CryptoJS.AES.decrypt(cipherParams, keyParsed, cfg);
            const result = decrypted.toString(CryptoJS.enc.Utf8);
            if (!result) {
                message.error('解密失败，请检查密文和密钥是否匹配');
                return;
            }
            setPlainText(result);
            message.success('解密成功');
        } catch {
            message.error('解密失败，请检查密文和密钥是否匹配');
        }
    };

    const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTimestamp(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleCopyTimestamp = () => {
        setPlainText(currentTimestamp.toString());
        message.success('时间戳已填入原始文本框');
    };

    const handleCopy = () => {
        if (!cipherText) {
            message.warning('暂无结果可复制');
            return;
        }
        navigator.clipboard.writeText(cipherText);
        message.success('已复制到剪贴板');
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                <LockOutlined /> AES 加密解密
            </Title>
            <Paragraph>
                支持 AES/ECB/PKCS5Padding 模式的在线加密和解密操作
            </Paragraph>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Card title="原始文本" size="small">
                        <TextArea
                            value={plainText}
                            onChange={(e) => setPlainText(e.target.value)}
                            placeholder="请输入要加密的原始文本..."
                            rows={8}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card title="密文" size="small">
                        <TextArea
                            value={cipherText}
                            onChange={(e) => setCipherText(e.target.value)}
                            placeholder="加密后的结果或要解密的密文..."
                            rows={8}
                        />
                    </Card>
                </Col>
            </Row>

            <Card style={{ marginTop: '16px' }}>
                <Row gutter={[16, 16]} align="middle" style={{ marginBottom: '12px' }}>
                    <Col xs={24} md={12}>
                        <Text strong><ClockCircleOutlined /> 当前时间戳：</Text>
                        <Text code style={{ fontSize: '16px', marginLeft: '8px' }}>{currentTimestamp}</Text>
                        <Button size="small" onClick={handleCopyTimestamp} style={{ marginLeft: '8px' }}>
                            填入文本框
                        </Button>
                    </Col>
                </Row>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={12} md={8}>
                        <Text strong>密钥：</Text>
                        <Input
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            placeholder="请输入密钥"
                            style={{ marginTop: '4px' }}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <Text strong>加密方式：</Text>
                        <Select
                            value={mode}
                            onChange={(val) => setMode(val)}
                            style={{ width: '100%', marginTop: '4px' }}
                            options={[
                                { value: 'AES/ECB/PKCS5Padding', label: 'AES/ECB/PKCS5Padding' },
                            ]}
                        />
                    </Col>
                    <Col xs={24} md={8}>
                        <Row gutter={[8, 8]} style={{ marginTop: '24px' }}>
                            <Col span={12}>
                                <Button type="primary" icon={<LockOutlined />} onClick={handleEncrypt} block>
                                    加密
                                </Button>
                            </Col>
                            <Col span={12}>
                                <Button icon={<UnlockOutlined />} onClick={handleDecrypt} block>
                                    解密
                                </Button>
                            </Col>
                        </Row>
                        <Row style={{ marginTop: '8px' }}>
                            <Col span={24}>
                                <Button icon={<CopyOutlined />} onClick={handleCopy} disabled={!cipherText} block>
                                    复制密文
                                </Button>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Card>
        </div>
    );
}
