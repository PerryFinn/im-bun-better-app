#!/bin/bash

# 设置颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 输入和输出文件
INPUT_FILE="../apps/server/src/index.ts"
OUTPUT_FILE="im-debug"

# 确保有输出目录
mkdir -p dist

echo -e "${BLUE}开始构建 macOS 和 Windows 版本...${NC}"

# 构建 macOS 版本 ARM（Apple Silicon） 架构
echo -e "${BLUE}正在构建 macOS 版本...${NC}"
bun build "$INPUT_FILE" --compile --outfile "dist/${OUTPUT_FILE}-arm64" --target=bun-darwin-arm64 --sourcemap
if [[ $? -eq 0 ]]; then
  echo -e "${GREEN}macOS 版本构建成功: dist/${OUTPUT_FILE}-arm64${NC}"
else
  echo "构建 macOS (Apple Silicon)版本失败"
  exit 1
fi

# 构建 macOS 版本 (Intel) 架构
echo -e "${BLUE}正在构建 macOS 版本...${NC}"
bun build "$INPUT_FILE" --compile --outfile "dist/${OUTPUT_FILE}" --target=bun-darwin-x64 --sourcemap
if [[ $? -eq 0 ]]; then
  echo -e "${GREEN}macOS 版本构建成功: dist/${OUTPUT_FILE}-x64${NC}"
else
  echo "构建 macOS (Intel) 版本失败"
  exit 1
fi

# 构建 Windows 版本
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