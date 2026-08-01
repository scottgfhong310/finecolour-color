#!/bin/bash
# sync-copies.sh — 把本 repo 的前端同步到所有登記的複製點，並逐檔驗證。
#
# 權威版＝ GitHub/finecolour-color。目前只有一個複製點：InProgress 鏡像。
# （lib 與 data 尚未被 color-palette / thangka-trace 借用——等 nearestFinecolour 真的接上
#   消費端時，比照 faber-castell-color/scripts/sync-copies.sh 補第 2 段。）
#
# **回灌不是一次性的**（WORKFLOW.md Path A 的 A4）：GitHub 版是權威，
# 之後每次改前端都要再跑一次，否則 3001 上跑的是舊版。
# 這支腳本存在的理由就是「別靠記性」——faber-castell-color 曾因為同步腳本
# 放在暫存區、暫存區被清掉而漏同步過一次。
#
# 用法：bash scripts/sync-copies.sh
set -u
G=/Users/Shared/nodeapp/GitHub
I=/Users/Shared/nodeapp/InProgress
SRC=$G/finecolour-color/public/apps/finecolour-color
DST=$I/public/apps/finecolour-color

echo "=== 整包前端 → InProgress 鏡像（只同步程式碼）==="
mkdir -p "$DST"
cp -R "$SRC/." "$DST/"

echo "=== 逐檔比對 ==="
if diff -rq "$SRC" "$DST" > /dev/null; then
  echo "  OK  與獨立版逐檔相同（$(find "$SRC" -type f | wc -l | tr -d ' ') 個檔）"
else
  echo "  MISMATCH  以下有差異："
  diff -rq "$SRC" "$DST"
  exit 1
fi

echo "=== 共用件 hash（應與家族其餘複製點一致）==="
for f in materialize-dark.css side-tool.css side-tool.js filter-clear.css filter-clear.js i18n.js; do
  printf "  %-22s %s\n" "$f" "$(md5 -q "$SRC/$f")"
done
