# CV Gen

一个可在线编辑简历、实时预览并导出/打印 PDF 的小工具。

## 目录结构

- `cv-gen-server/`：主项目（静态前端 + Node HTTP Server）

## 功能

- 三套简历模板：`classic / creative / minimal`
- 实时预览，支持 A4 分页预览
- 导出 PDF（与预览保持一致的分页效果）
- 图片上传（头像）
- 轻量 Markdown：`**加粗**`、`*斜体*`、`` `代码` ``、字段内 `\n` 换行
- 特殊 Markdown: `==标题变细==`
- 草稿文件管理（服务端持久化）
  - 默认文件：`cv-gen-server/data/default.json`
  - 另存为：保存为 `cv-gen-server/data/<文件名>.json`

## 启动

进入目录：

```bash
cd cv-gen-server
```

启动（默认端口 3000）：

```bash
npm run start
```

指定模板与端口：

```bash
node server.js --template=minimal --port=3000
```

启动后访问：

- http://localhost:3000

## 数据与接口

所有草稿 JSON 都保存在：

- `cv-gen-server/data/`

接口：

- `GET /api/drafts`：获取服务端草稿文件列表
- `GET /api/draft?name=<filename>`：读取草稿文件（默认 `default.json`）
- `POST /api/draft?name=<filename>`：保存/覆盖草稿文件
- `GET /api/templates`：获取模板列表与当前模板
- `POST /api/templates`：保存当前模板（写入 `cv-gen-server/data/template.json`）

## GitHub 提交建议

- `cv-gen-server/data/` 下会产生你的个人草稿文件；仓库默认只保留 `default.json`，其余草稿已被 `.gitignore` 忽略。

## 浏览器端展示

<img width="930" height="429" alt="企业微信截图_17737327762454" src="https://github.com/user-attachments/assets/0635ee53-c4ca-498a-a707-741ffaad02d4" />
