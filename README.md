# Love Chat 小程序

一个基于微信小程序和云开发的聊天分析工具。

## 项目结构

```
love_chat
├── cloudfunctions/        # 云函数目录
│   └── analyzeChat/       # 聊天分析云函数
└── miniprogram/           # 小程序前端代码目录
    ├── app.js
    ├── app.json
    ├── app.wxss
    └── pages/
        └── index/         # 首页
```

## 功能简介

- 分析微信小程序内的聊天记录。
- 利用微信云开发进行后端处理。

## 部署指南

### 前置要求

- 微信开发者工具
- 微信小程序账号并开通云开发

### 安装步骤

1. 克隆或下载此项目代码。
2. 在微信开发者工具中导入项目。
3. 在 `miniprogram/app.js` 中，将 `env` 字段替换为你自己的云开发环境ID。
4. 在微信开发者工具中上传并部署 `cloudfunctions/analyzeChat` 目录下的云函数。
5. 在 `cloudfunctions\analyzeChat\index.js` 中，将 `DEEPSEEK_API_KEY` 字段替换为你自己的api_key。
6. 在 `project.config.json` 中，将 `appid` 字段替换为你自己的appid。


## 本地开发

### 前端 (小程序)

1. 使用微信开发者工具打开 `miniprogram` 目录。
2. 确保已在 `app.js` 中正确配置云环境ID。

### 后端 (云函数)

1. 进入 `cloudfunctions/analyzeChat` 目录。
2. 安装依赖：`npm install`。
3. 在微信开发者工具中上传并部署云函数。

## 依赖

### 云函数 `analyzeChat`

- `wx-server-sdk`: 微信云开发服务端SDK
- `tencentcloud-sdk-nodejs`: 腾讯云SDK for Node.js
- `axios`: 基于 Promise 的 HTTP 库

## 注意事项

- 请确保使用 2.2.3 或以上版本的基础库以使用云能力。
- 云函数部署前请检查并安装所有依赖。