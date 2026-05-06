// 导入路由组件和 Link
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import MainLayout from './components/MainLayout'; // 导入我们创建的布局组件

// 导入你的页面
import Home from './pages/home/Home';
import About from './pages/about/About';
import Base64Tool from './pages/tools/Base64Tool';
import ConfigFormatter from './pages/tools/ConfigFormatter';
import URLCodec from './pages/tools/URLCodec';
import Timestamp from './pages/tools/Timestamp';
import QRCodeGenerator from './pages/tools/QRCodeGenerator';
import ColorPicker from './pages/tools/ColorPicker';
import Markdown from './pages/tools/Markdown';
import PasswordGenerator from './pages/tools/PasswordGenerator';
import IPCalculator from './pages/tools/ipcalculator/IPCalculator';
import FileTransfer from './pages/tools/FileTransfer';
import NamingConverter from './pages/tools/NamingConverter';
import CronExpression from './pages/tools/CronExpression';
import Base64FileConverter from './pages/tools/Base64FileConverter';
import JwtParser from './pages/tools/JwtParser';
import TextDiff from './pages/tools/TextDiff';
import AESCipher from './pages/tools/AESCipher';
import SQLToMyBatisPlus from './pages/tools/SQLToMyBatisPlus';
import JsonToJavaBean from './pages/tools/JsonToJavaBean';

// 导入AI页面
import AIToolsOverview from './pages/ai/AIToolsOverview';
import AITextGeneration from './pages/ai/AITextGeneration';
import AIImageGeneration from './pages/ai/AIImageGeneration';
import AITextTranslation from './pages/ai/AITextTranslation';

function App() {
  return (
    <BrowserRouter>
      {/* 路由展示区 */}
      <MainLayout>
        {/* Routes 负责匹配当前 URL 对应的 Route */}
        <Routes>
          {/* 首页路由 */}
          <Route path="/" element={<Home />} />

          {/* About 页面路由 */}
          <Route path="/about" element={<About />} />

          {/* 工具页面路由 */}
          <Route path="/tools/base64" element={<Base64Tool />} />
          <Route path="/tools/config-formatter" element={<ConfigFormatter />} />
          <Route path="/tools/url-codec" element={<URLCodec />} />
          <Route path="/tools/timestamp" element={<Timestamp />} />
          <Route path="/tools/qr-code-generator" element={<QRCodeGenerator />} />
          <Route path="/tools/color-picker" element={<ColorPicker />} />
          <Route path="/tools/markdown" element={<Markdown />} />
          <Route path="/tools/password-generator" element={<PasswordGenerator />} />
          <Route path="/tools/ip-calculator" element={<IPCalculator />} />
          <Route path="/tools/file-transfer" element={<FileTransfer />} />
                    <Route path="/tools/naming-converter" element={<NamingConverter />} />
                              <Route path="/tools/cron-expression" element={<CronExpression />} />
                                        <Route path="/tools/base64-file" element={<Base64FileConverter />} />
                                                  <Route path="/tools/jwt-parser" element={<JwtParser />} />
                                                            <Route path="/tools/text-diff" element={<TextDiff />} />
                                                                      <Route path="/tools/aes-cipher" element={<AESCipher />} />
                                                                                <Route path="/tools/sql-to-mybatis" element={<SQLToMyBatisPlus />} />
                                                                                          <Route path="/tools/json-to-java" element={<JsonToJavaBean />} />

          {/* AI工具页面路由 */}
          <Route path="/ai" element={<AIToolsOverview />} />
          <Route path="/ai/text-generation" element={<AITextGeneration />} />
          <Route path="/ai/image-generation" element={<AIImageGeneration />} />
          <Route path="/ai/text-translation" element={<AITextTranslation />} />

          {/* 可选: 404 页面 */}
          <Route path="*" element={<h2>404 Not Found</h2>} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

export default App