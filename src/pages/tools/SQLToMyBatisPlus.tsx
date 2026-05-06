import { useState } from 'react';
import { Card, Input, Button, Typography, Row, Col, Tabs, message } from 'antd';
import { CodeOutlined, CopyOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface ColumnInfo {
    name: string;
    javaName: string;
    sqlType: string;
    javaType: string;
    nullable: boolean;
    isPk: boolean;
    isAutoIncrement: boolean;
    comment: string;
}

interface TableInfo {
    name: string;
    className: string;
    comment: string;
    columns: ColumnInfo[];
    pkColumn?: ColumnInfo;
}

function toCamelCase(snake: string, upperFirst = false): string {
    const result = snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    return upperFirst ? result.charAt(0).toUpperCase() + result.slice(1) : result;
}

function sqlTypeToJavaType(sqlType: string): string {
    const t = sqlType.toLowerCase();
    if (t.includes('bigint')) return 'Long';
    if (t.includes('tinyint(1)')) return 'Boolean';
    if (t.includes('tinyint')) return 'Integer';
    if (t.includes('smallint')) return 'Integer';
    if (t.includes('mediumint')) return 'Integer';
    if (t.includes('int')) return 'Integer';
    if (t.includes('decimal') || t.includes('numeric')) return 'BigDecimal';
    if (t.includes('float')) return 'Float';
    if (t.includes('double')) return 'Double';
    if (t.includes('datetime') || t.includes('timestamp')) return 'LocalDateTime';
    if (t.includes('date')) return 'LocalDate';
    if (t.includes('time')) return 'LocalTime';
    if (t.includes('blob') || t.includes('binary')) return 'byte[]';
    return 'String';
}

function sqlTypeToJdbcType(sqlType: string): string {
    const t = sqlType.toLowerCase();
    if (t.includes('bigint')) return 'BIGINT';
    if (t.includes('tinyint(1)')) return 'BOOLEAN';
    if (t.includes('tinyint')) return 'TINYINT';
    if (t.includes('smallint')) return 'SMALLINT';
    if (t.includes('mediumint')) return 'INTEGER';
    if (t.includes('int')) return 'INTEGER';
    if (t.includes('decimal')) return 'DECIMAL';
    if (t.includes('numeric')) return 'NUMERIC';
    if (t.includes('float')) return 'FLOAT';
    if (t.includes('double')) return 'DOUBLE';
    if (t.includes('datetime')) return 'TIMESTAMP';
    if (t.includes('timestamp')) return 'TIMESTAMP';
    if (t.includes('date')) return 'DATE';
    if (t.includes('time')) return 'TIME';
    if (t.includes('blob')) return 'BLOB';
    if (t.includes('binary')) return 'BINARY';
    if (t.includes('text')) return 'LONGVARCHAR';
    if (t.includes('char')) return 'CHAR';
    if (t.includes('varchar')) return 'VARCHAR';
    return 'VARCHAR';
}

function parseSQL(sql: string): TableInfo | null {
    const trimmed = sql.trim();
    if (!trimmed) return null;

    // 匹配 CREATE TABLE 表名
    let match = trimmed.match(/CREATE\s+TABLE\s+(?:`?)(\w+)(?:`?)\s*\((.*)\)\s*(?:ENGINE|COMMENT|DEFAULT|CHARSET|;|$)/is);
    if (!match) {
        // 尝试更宽松的匹配
        match = trimmed.match(/CREATE\s+TABLE\s+(?:`?)(\w+)(?:`?)\s*\((.*)\)/is);
    }
    if (!match) return null;

    const tableName = match[1];
    const body = match[2];

    // 提取表注释
    const tableCommentMatch = trimmed.match(/COMMENT\s*=\s*['"`](.+?)['"`]/i);
    const tableComment = tableCommentMatch ? tableCommentMatch[1] : '';

    const columns: ColumnInfo[] = [];
    let pkColumn: ColumnInfo | undefined;

    // 按行分割，处理每个字段或约束
    const lines = body.split(',');
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // 跳过约束行（PRIMARY KEY, KEY, INDEX, FOREIGN KEY, UNIQUE）
        if (/^(PRIMARY\s+KEY|KEY|INDEX|FOREIGN\s+KEY|UNIQUE|CONSTRAINT)/i.test(line)) {
            // 提取主键字段名
            const pkMatch = line.match(/PRIMARY\s+KEY\s*\(\s*`?(\w+)`?\s*\)/i);
            if (pkMatch) {
                const pkName = pkMatch[1];
                const existing = columns.find(c => c.name === pkName);
                if (existing) {
                    existing.isPk = true;
                    pkColumn = existing;
                }
            }
            continue;
        }

        // 匹配列定义
        const colMatch = line.match(/^`?(\w+)`?\s+(\w+(?:\(\d+(?:,\d+)?\))?)/i);
        if (!colMatch) continue;

        const colName = colMatch[1];
        const colType = colMatch[2];

        const isPk = /PRIMARY\s+KEY/i.test(line) || (!pkColumn && /AUTO_INCREMENT/i.test(line));
        const isAutoIncrement = /AUTO_INCREMENT/i.test(line);
        const nullable = !/NOT\s+NULL/i.test(line);

        const commentMatch = line.match(/COMMENT\s+['"`](.+?)['"`]/i);
        const comment = commentMatch ? commentMatch[1] : '';

        const column: ColumnInfo = {
            name: colName,
            javaName: toCamelCase(colName),
            sqlType: colType,
            javaType: sqlTypeToJavaType(colType),
            nullable,
            isPk,
            isAutoIncrement,
            comment,
        };
        columns.push(column);
        if (isPk) pkColumn = column;
    }

    // 如果没有显式主键，第一个字段作为主键（常见设计）
    if (!pkColumn && columns.length > 0) {
        columns[0].isPk = true;
        pkColumn = columns[0];
    }

    return {
        name: tableName,
        className: toCamelCase(tableName, true),
        comment: tableComment,
        columns,
        pkColumn,
    };
}

function generateEntity(table: TableInfo, pkg: string): string {
    return `package ${pkg}.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.TableField;
import lombok.Data;
${table.columns.some(c => c.javaType === 'LocalDateTime') ? 'import java.time.LocalDateTime;\n' : ''}${table.columns.some(c => c.javaType === 'LocalDate') ? 'import java.time.LocalDate;\n' : ''}${table.columns.some(c => c.javaType === 'LocalTime') ? 'import java.time.LocalTime;\n' : ''}${table.columns.some(c => c.javaType === 'BigDecimal') ? 'import java.math.BigDecimal;\n' : ''}
/**
 * ${table.comment || table.className}
 */
@Data
@TableName("${table.name}")
public class ${table.className} {
${table.columns.map(col => {
        let anno = '';
        if (col.isPk) {
            anno = col.isAutoIncrement
                ? `    @TableId(value = "${col.name}", type = IdType.AUTO)\n`
                : `    @TableId(value = "${col.name}")\n`;
        } else {
            anno = `    @TableField("${col.name}")\n`;
        }
        const comment = col.comment ? ` // ${col.comment}` : '';
        return `${anno}    private ${col.javaType} ${col.javaName};${comment}`;
    }).join('\n\n')}
}`;
}

function generateMapper(table: TableInfo, pkg: string): string {
    return `package ${pkg}.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import ${pkg}.entity.${table.className};
import org.apache.ibatis.annotations.Mapper;

/**
 * ${table.comment || table.className} Mapper
 */
@Mapper
public interface ${table.className}Mapper extends BaseMapper<${table.className}> {
}`;
}

function generateService(table: TableInfo, pkg: string): string {
    return `package ${pkg}.service;

import com.baomidou.mybatisplus.extension.service.IService;
import ${pkg}.entity.${table.className};

/**
 * ${table.comment || table.className} Service
 */
public interface ${table.className}Service extends IService<${table.className}> {
}`;
}

function generateServiceImpl(table: TableInfo, pkg: string): string {
    return `package ${pkg}.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import ${pkg}.entity.${table.className};
import ${pkg}.mapper.${table.className}Mapper;
import ${pkg}.service.${table.className}Service;
import org.springframework.stereotype.Service;

/**
 * ${table.comment || table.className} ServiceImpl
 */
@Service
public class ${table.className}ServiceImpl extends ServiceImpl<${table.className}Mapper, ${table.className}> implements ${table.className}Service {
}`;
}

function generateController(table: TableInfo, pkg: string): string {
    const pkType = table.pkColumn ? table.pkColumn.javaType : 'Long';
    return `package ${pkg}.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import ${pkg}.entity.${table.className};
import ${pkg}.service.${table.className}Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * ${table.comment || table.className} Controller
 */
@RestController
@RequestMapping("/${toCamelCase(table.name)}")
public class ${table.className}Controller {

    @Autowired
    private ${table.className}Service ${toCamelCase(table.name)}Service;

    @GetMapping("/list")
    public List<${table.className}> list() {
        return ${toCamelCase(table.name)}Service.list();
    }

    @GetMapping("/page")
    public Page<${table.className}> page(@RequestParam(defaultValue = "1") int current,
                                         @RequestParam(defaultValue = "10") int size) {
        return ${toCamelCase(table.name)}Service.page(new Page<>(current, size));
    }

    @GetMapping("/{id}")
    public ${table.className} getById(@PathVariable ${pkType} id) {
        return ${toCamelCase(table.name)}Service.getById(id);
    }

    @PostMapping
    public boolean save(@RequestBody ${table.className} entity) {
        return ${toCamelCase(table.name)}Service.save(entity);
    }

    @PutMapping
    public boolean update(@RequestBody ${table.className} entity) {
        return ${toCamelCase(table.name)}Service.updateById(entity);
    }

    @DeleteMapping("/{id}")
    public boolean delete(@PathVariable ${pkType} id) {
        return ${toCamelCase(table.name)}Service.removeById(id);
    }
}`;
}

function generateXML(table: TableInfo, pkg: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="${pkg}.mapper.${table.className}Mapper">

    <resultMap id="BaseResultMap" type="${pkg}.entity.${table.className}">
${table.columns.map(col => `        <result column="${col.name}" property="${col.javaName}" jdbcType="${sqlTypeToJdbcType(col.sqlType)}" />`).join('\n')}
    </resultMap>

    <sql id="Base_Column_List">
        ${table.columns.map(c => c.name).join(', ')}
    </sql>

</mapper>`;
}

export default function SQLToMyBatisPlus() {
    useAutoTrackVisit('SQL转MyBatis-Plus');

    const [sqlInput, setSqlInput] = useState('');
    const [packageName, setPackageName] = useState('com.example');
    const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);

    const handleGenerate = () => {
        if (!sqlInput.trim()) {
            message.warning('请输入 CREATE TABLE SQL 语句');
            return;
        }
        const result = parseSQL(sqlInput);
        if (!result) {
            message.error('SQL 解析失败，请检查是否为标准的 CREATE TABLE 语句');
            return;
        }
        setTableInfo(result);
        message.success('生成成功');
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        message.success('已复制到剪贴板');
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                <CodeOutlined /> SQL 转 MyBatis-Plus
            </Title>
            <Paragraph>
                输入 MySQL CREATE TABLE 语句，自动生成 Entity、Mapper、Service、Controller、XML 代码模板
            </Paragraph>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                    <Card title="输入 SQL" size="small">
                        <TextArea
                            value={sqlInput}
                            onChange={(e) => setSqlInput(e.target.value)}
                            placeholder={`CREATE TABLE \`user\` (\n  \`id\` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键',\n  \`name\` varchar(50) NOT NULL COMMENT '姓名',\n  \`create_time\` datetime DEFAULT NULL COMMENT '创建时间',\n  PRIMARY KEY (\`id\`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';`}
                            rows={14}
                        />
                        <Input
                            value={packageName}
                            onChange={(e) => setPackageName(e.target.value)}
                            placeholder="请输入包名"
                            style={{ marginTop: '8px' }}
                            addonBefore="包名"
                        />
                        <Button type="primary" onClick={handleGenerate} block style={{ marginTop: '12px' }}>
                            生成代码
                        </Button>
                    </Card>
                </Col>
                <Col xs={24} md={14}>
                    {tableInfo && (
                        <Card title={`表: ${tableInfo.name} → ${tableInfo.className}`} size="small">
                            <Tabs type="card">
                                <TabPane tab="Entity" key="entity">
                                    <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto', maxHeight: '500px' }}>
                                        {generateEntity(tableInfo, packageName)}
                                    </pre>
                                    <Button icon={<CopyOutlined />} onClick={() => handleCopy(generateEntity(tableInfo, packageName))} size="small">
                                        复制
                                    </Button>
                                </TabPane>
                                <TabPane tab="Mapper" key="mapper">
                                    <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto', maxHeight: '500px' }}>
                                        {generateMapper(tableInfo, packageName)}
                                    </pre>
                                    <Button icon={<CopyOutlined />} onClick={() => handleCopy(generateMapper(tableInfo, packageName))} size="small">
                                        复制
                                    </Button>
                                </TabPane>
                                <TabPane tab="Service" key="service">
                                    <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto', maxHeight: '500px' }}>
                                        {generateService(tableInfo, packageName)}
                                    </pre>
                                    <Button icon={<CopyOutlined />} onClick={() => handleCopy(generateService(tableInfo, packageName))} size="small">
                                        复制
                                    </Button>
                                </TabPane>
                                <TabPane tab="ServiceImpl" key="serviceImpl">
                                    <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto', maxHeight: '500px' }}>
                                        {generateServiceImpl(tableInfo, packageName)}
                                    </pre>
                                    <Button icon={<CopyOutlined />} onClick={() => handleCopy(generateServiceImpl(tableInfo, packageName))} size="small">
                                        复制
                                    </Button>
                                </TabPane>
                                <TabPane tab="Controller" key="controller">
                                    <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto', maxHeight: '500px' }}>
                                        {generateController(tableInfo, packageName)}
                                    </pre>
                                    <Button icon={<CopyOutlined />} onClick={() => handleCopy(generateController(tableInfo, packageName))} size="small">
                                        复制
                                    </Button>
                                </TabPane>
                                <TabPane tab="XML" key="xml">
                                    <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto', maxHeight: '500px' }}>
                                        {generateXML(tableInfo, packageName)}
                                    </pre>
                                    <Button icon={<CopyOutlined />} onClick={() => handleCopy(generateXML(tableInfo, packageName))} size="small">
                                        复制
                                    </Button>
                                </TabPane>
                            </Tabs>
                        </Card>
                    )}
                </Col>
            </Row>
        </div>
    );
}
