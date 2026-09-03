#!/bin/bash

# 轻量编译入口：只生成 macOS 与 Windows 服务端可执行文件。
# 该脚本不会清理已有产物，也不会复制生产启动所需的 db-migrations；
# 需要完整发布目录时，请使用 package-server-distribution.ts。

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 这些相对路径以 scripts 目录为基准，因此应从该目录执行脚本。
INPUT_FILE="../apps/server/src/index.ts"
OUTPUT_FILE="im-debug"

mkdir -p dist

echo -e "${BLUE}开始构建 macOS 和 Windows 版本...${NC}"

# Bun 的 compile target 决定产物运行平台，不能用当前机器架构替代。
echo -e "${BLUE}正在构建 macOS 版本...${NC}"
bun build "$INPUT_FILE" --compile --outfile "dist/${OUTPUT_FILE}-arm64" --target=bun-darwin-arm64 --sourcemap
if [[ $? -eq 0 ]]; then
  echo -e "${GREEN}macOS 版本构建成功: dist/${OUTPUT_FILE}-arm64${NC}"
else
  echo "构建 macOS (Apple Silicon)版本失败"
  exit 1
fi

echo -e "${BLUE}正在构建 macOS 版本...${NC}"
bun build "$INPUT_FILE" --compile --outfile "dist/${OUTPUT_FILE}" --target=bun-darwin-x64 --sourcemap
if [[ $? -eq 0 ]]; then
  echo -e "${GREEN}macOS 版本构建成功: dist/${OUTPUT_FILE}-x64${NC}"
else
  echo "构建 macOS (Intel) 版本失败"
  exit 1
fi

echo -e "${BLUE}正在构建 Windows 版本...${NC}"
WINDOWS_OUTPUT="${OUTPUT_FILE}.exe"
bun build "$INPUT_FILE" --compile --outfile "dist/${WINDOWS_OUTPUT}" --target=bun-windows-x64 --sourcemap
if [[ $? -eq 0 ]]; then
  echo -e "${GREEN}Windows 版本构建成功: dist/${WINDOWS_OUTPUT}${NC}"
else
  echo "构建 Windows 版本失败"
  exit 1
fi

echo -e "${GREEN}构建完成!${NC}"
