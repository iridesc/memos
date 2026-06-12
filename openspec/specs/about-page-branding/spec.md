# About Page Branding

## Purpose

将 About 页面的品牌标识从上游 Memos 更新为 Memodo，包括项目名称、链接、标语、产品描述和赞助商信息，同时保留 Birds 区块。

## Requirements

### Requirement: About 页面展示 Memodo 品牌标识

About 页面应当在标题区域展示项目名称 "Memodo" 而非 "Memos"。

#### Scenario: About 页面渲染 Memodo 名称

- **WHEN** 用户导航到 About 页面
- **THEN** 主标题展示 "Memodo"
- **AND** 页面描述将 Memodo 称为一款开源的笔记工具

### Requirement: About 页面使用 fork 仓库的项目链接

About 页面应当链接到 fork 仓库 (`github.com/iridesc/memos`)，不应当链接到上游 `usememos.com` 或 `github.com/usememos/memos`。

#### Scenario: GitHub 链接指向 fork 仓库

- **WHEN** About 页面渲染
- **THEN** 存在 GitHub 链接按钮
- **AND** 链接目标为 `https://github.com/iridesc/memos`

#### Scenario: 不存在上游网站或文档链接

- **WHEN** About 页面渲染
- **THEN** 不存在指向 `usememos.com` 的链接
- **AND** 不存在指向 `usememos.com/docs` 的链接

### Requirement: About 页面标语体现 Memodo 品牌

About 页面应当展示适合 Memodo 项目的标语，替换上游的 "Capture first. Keep it yours."。

#### Scenario: Memodo 标语展示

- **WHEN** 用户查看 About 页面
- **THEN** 在项目名称下方展示 Memodo 的简短描述性标语

### Requirement: 产品要点体现 Memodo 特性

About 页面应当展示体现 Memodo 作为自托管笔记与待办管理工具身份的产品描述要点。

#### Scenario: 产品要点展示

- **WHEN** About 页面渲染 Product 区块
- **THEN** 展示产品描述条目
- **AND** 条目描述 Memodo 的能力（笔记、待办、自托管、Markdown 原生）

### Requirement: 不展示上游赞助商信息

About 页面不应当展示上游 Memos 的赞助商（CodeRabbit、Warp）。

#### Scenario: 赞助商区块不存在

- **WHEN** 用户查看 About 页面
- **THEN** 不存在来自上游 Memos 的赞助商 logo 或链接

### Requirement: 保留 Birds 区块

About 页面应当保留 Birds 区块，展示用于空状态的像素精灵方块。

#### Scenario: Birds 区块渲染

- **WHEN** About 页面渲染
- **THEN** 存在 Birds 区块，展示像素精灵方块
- **AND** 每个方块展示其精灵名称
