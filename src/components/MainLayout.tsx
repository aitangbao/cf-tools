/*
 * File: MainLayout.tsx
 * Project: cf-tools
 * File Created: Thursday, 6th November 2025 8:00:28 am
 * Author: tianyao (ty18710388929@163.com)
 * -----
 * Last Modified: Thursday, 6th November 2025 8:09:19 pm
 * Modified By: tianyao (ty18710388929@163.com>)
 * -----
 * Copyright <<projectCreationYear>> - 2025 tianyao, tianyao
 */

import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme, Typography, Button, Drawer } from 'antd';
import {
    UserOutlined,
    PictureOutlined,
    ToolOutlined,
    CodeOutlined,
    LinkOutlined,
    ClockCircleOutlined,
    QrcodeOutlined,
    BgColorsOutlined,
    FileTextOutlined,
    LockOutlined,
    RobotOutlined,
    TranslationOutlined,
    EditOutlined,
    DownOutlined,
    MenuOutlined,
    SwapOutlined,
    ScheduleOutlined,
    FileImageOutlined,
    SafetyOutlined,
    DiffOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import CuteAvatar from './CuteAvatar';
import './MainLayout.css';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

// 定义顶部菜单项
const menuItems = [
    { key: '/', icon: <UserOutlined />, label: <Link to="/">首页</Link> },
    {
        key: '/tools',
        icon: <ToolOutlined />,
        label: (
            <span>
                工具集
                <DownOutlined style={{ fontSize: '12px', marginLeft: '4px' }} />
            </span>
        ),
        children: [
            { key: '/tools/config-formatter', icon: <CodeOutlined />, label: <Link to="/tools/config-formatter">JSON/配置文件格式转换</Link> },
            { key: '/tools/naming-converter', icon: <EditOutlined />, label: <Link to="/tools/naming-converter">命名转换器</Link> },
            { key: '/tools/cron-expression', icon: <ScheduleOutlined />, label: <Link to="/tools/cron-expression">Cron表达式</Link> },
            { key: '/tools/base64-file', icon: <FileImageOutlined />, label: <Link to="/tools/base64-file">Base64文件转换</Link> },
            { key: '/tools/jwt-parser', icon: <SafetyOutlined />, label: <Link to="/tools/jwt-parser">JWT解析器</Link> },
                        { key: '/tools/text-diff', icon: <DiffOutlined />, label: <Link to="/tools/text-diff">文本比较</Link> },
            { key: '/tools/base64', icon: <CodeOutlined />, label: <Link to="/tools/base64">Base64编解码</Link> },
            { key: '/tools/url-codec', icon: <LinkOutlined />, label: <Link to="/tools/url-codec">URL编解码</Link> },
            { key: '/tools/timestamp', icon: <ClockCircleOutlined />, label: <Link to="/tools/timestamp">时间戳转换</Link> },
            { key: '/tools/qr-code-generator', icon: <QrcodeOutlined />, label: <Link to="/tools/qr-code-generator">二维码生成</Link> },
            { key: '/tools/color-picker', icon: <BgColorsOutlined />, label: <Link to="/tools/color-picker">颜色选择器</Link> },
            { key: '/tools/markdown', icon: <FileTextOutlined />, label: <Link to="/tools/markdown">Markdown预览</Link> },
            { key: '/tools/password-generator', icon: <LockOutlined />, label: <Link to="/tools/password-generator">密码生成器</Link> },
            { key: '/tools/ip-calculator', icon: <CodeOutlined />, label: <Link to="/tools/ip-calculator">IP计算器</Link> },
            { key: '/tools/file-transfer', icon: <SwapOutlined />, label: <Link to="/tools/file-transfer">P2P文件直传</Link> },


        ]
    },
    {
        key: '/ai',
        icon: <RobotOutlined />,
        label: (
            <span>
                AI工具集
                <DownOutlined style={{ fontSize: '12px', marginLeft: '4px' }} />
            </span>
        ),
        children: [
            { key: '/ai', icon: <RobotOutlined />, label: <Link to="/ai">AI工具总览</Link> },
            { key: '/ai/text-generation', icon: <EditOutlined />, label: <Link to="/ai/text-generation">AI文本生成</Link> },
            { key: '/ai/image-generation', icon: <PictureOutlined />, label: <Link to="/ai/image-generation">AI图像生成</Link> },
            { key: '/ai/text-translation', icon: <TranslationOutlined />, label: <Link to="/ai/text-translation">AI文本翻译</Link> },
        ]
    },
    { key: '/about', icon: <PictureOutlined />, label: <Link to="https://219921.xyz/">关于</Link> },
];


interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const location = useLocation(); // 获取当前路由信息

    // 获取当前激活的菜单项
    const selectedKeys = [location.pathname];

    // 检测屏幕尺寸
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    // 更新时间
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 格式化时间
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // 获取问候语
    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 6) return '🌙 夜深了';
        if (hour < 12) return '☀️ 早上好';
        if (hour < 14) return '🌞 中午好';
        if (hour < 18) return '🌅 下午好';
        return '🌆 晚上好';
    };
    // 处理移动端菜单点击
    const handleMobileMenuClick = () => {
        setMobileMenuVisible(false);
    };

    // 移动端菜单项（转换为垂直模式）
    const mobileMenuItems = menuItems.map(item => {
        if (item.children) {
            return {
                ...item,
                children: item.children?.map(child => ({
                    ...child,
                    label: React.cloneElement(child.label, { onClick: handleMobileMenuClick })
                }))
            };
        }
        return {
            ...item,
            label: React.cloneElement(item.label, { onClick: handleMobileMenuClick })
        };
    });

    return (
        <Layout className="main-layout" style={{ minHeight: '100vh' }}>
            <Header
                className="top-header"
                style={{
                    background: colorBgContainer,
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: '48px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000
                }}
            >
                {/* 左侧：Logo 和品牌 */}
                <div className="header-left">
                    <div className="brand-section">
                        <img
                            src="/icon.png"
                            alt="App Logo"
                            className="brand-logo"
                        />
                        <div className="brand-info">
                            <Text strong className="brand-title">CF-TOOLS</Text>
                            <Text className="brand-subtitle">实用工具集合</Text>
                        </div>
                    </div>
                </div>

                {/* 中间：导航菜单 - 桌面端显示 */}
                {!isMobile && (
                    <div className="header-center">
                        <Menu
                            className="top-menu"
                            mode="horizontal"
                            selectedKeys={selectedKeys}
                            items={menuItems}
                            style={{
                                border: 'none',
                                background: 'transparent'
                            }}
                        />
                    </div>
                )}

                {/* 右侧：移动端菜单按钮和头像 */}
                <div className="header-right">
                    <div className="interaction-section">
                        {/* 移动端菜单按钮 */}
                        {isMobile && (
                            <Button
                                type="text"
                                icon={<MenuOutlined />}
                                onClick={() => setMobileMenuVisible(true)}
                                className="mobile-menu-button"
                                style={{
                                    border: 'none',
                                    fontSize: '16px',
                                    height: '32px',
                                    width: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            />
                        )}

                        {/* 可爱动漫头像 */}
                        <CuteAvatar className={isMobile ? 'mobile-avatar' : ''} />

                        {/* 问候语和时间 - 仅桌面端显示 */}
                        {!isMobile && (
                            <div className="time-section">
                                <Text className="greeting-text">
                                    {getGreeting()}
                                </Text>
                                <Text className="time-text">
                                    {formatTime(currentTime)}
                                </Text>
                            </div>
                        )}
                    </div>
                </div>
            </Header>

            {/* 移动端侧边抽屉菜单 */}
            <Drawer
                title="导航菜单"
                placement="right"
                onClose={() => setMobileMenuVisible(false)}
                open={mobileMenuVisible}
                width={280}
                bodyStyle={{ padding: 0 }}
                className="mobile-drawer"
            >
                <Menu
                    mode="vertical"
                    selectedKeys={selectedKeys}
                    items={mobileMenuItems}
                    style={{
                        border: 'none',
                        height: '100%'
                    }}
                />
            </Drawer>

            {/* 主内容区域 */}
            <Content className="main-content">
                <div
                    className="content-container"
                    style={{
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                        padding: '24px',
                        minHeight: 'calc(100vh - 48px - 70px)'
                    }}
                >
                    {/* 路由页面内容将显示在这里 */}
                    {children}
                </div>
            </Content>

            {/* 页脚 */}
            <Footer className="main-footer">
                Cloudflare App Created with Ant Design ©{new Date().getFullYear()}
            </Footer>
        </Layout>
    );
}