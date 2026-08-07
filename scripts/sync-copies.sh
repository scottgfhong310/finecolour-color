#!/bin/bash
# sync-copies.sh — 把本 repo 的前端同步到所有登記的複製點，並逐檔驗證。
#
# 權威版＝ GitHub/finecolour-color。複製點兩類：
#   ① InProgress 鏡像（整包前端）
#   ② color-palette / thangka-trace / color-mixer 的 lib + 資料（它們呼叫 nearestFinecolour）
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
FAIL=0

echo "=== 整包前端 → InProgress 鏡像（只同步程式碼）==="
mkdir -p "$DST"
cp -R "$SRC/." "$DST/"

echo "=== 逐檔比對 ==="
if diff -rq "$SRC" "$DST" > /dev/null; then
  echo "  OK  與獨立版逐檔相同（$(find "$SRC" -type f | wc -l | tr -d ' ') 個檔）"
else
  echo "  MISMATCH  以下有差異："
  diff -rq "$SRC" "$DST"
  FAIL=1
fi

echo "=== 共用件 hash（應與家族其餘複製點一致）==="
for f in materialize-dark.css side-tool.css side-tool.js filter-clear.css filter-clear.js i18n.js; do
  printf "  %-22s %s\n" "$f" "$(md5 -q "$SRC/$f")"
done

echo
echo "=== 2) lib + 資料 → color-palette / thangka-trace / color-mixer（含各自的 InProgress 鏡像）==="
# 三支消費端呼叫 nearestFinecolour 做「最接近的筆」。它們**不連任何 DB**，
# 靠的就是這裡複製過去的 lib 與資料——所以每次改本 repo 的 lib／資料都要再跑一次。
# 資料本身是 db_artcolor 的匯出產物（見 DESIGN.md §3），本段只負責散佈、不產生。
for app in color-palette thangka-trace color-mixer; do
  for dst in "$G/$app/public/apps/$app" "$I/public/apps/$app"; do
    [ -d "$dst" ] || { echo "  MISSING $dst"; FAIL=1; continue; }
    cp "$SRC/finecolour-color-lib.js" "$dst/finecolour-color-lib.js"
    cp "$SRC/data/finecolour-colors.js" "$dst/data/finecolour-colors.js"
  done
done

verify() {   # $1=檔名相對路徑, 其餘=所有複製點
  local label=$1; shift
  local n
  n=$(md5 -r "$@" | awk '{print $1}' | sort -u | wc -l | tr -d ' ')
  if [ "$n" = "1" ]; then echo "  OK        $label — $# 份單一 hash"
  else echo "  MISMATCH  $label — $n 種 hash"; md5 -r "$@"; FAIL=1; fi
}

echo
echo "=== md5 驗證（消費端複製件）==="
verify "finecolour-color-lib.js" \
  "$SRC/finecolour-color-lib.js" \
  "$G/color-palette/public/apps/color-palette/finecolour-color-lib.js" \
  "$G/thangka-trace/public/apps/thangka-trace/finecolour-color-lib.js" \
  "$I/public/apps/finecolour-color/finecolour-color-lib.js" \
  "$I/public/apps/color-palette/finecolour-color-lib.js" \
  "$I/public/apps/thangka-trace/finecolour-color-lib.js" \
  "$G/color-mixer/public/apps/color-mixer/finecolour-color-lib.js" \
  "$I/public/apps/color-mixer/finecolour-color-lib.js"

verify "data/finecolour-colors.js" \
  "$SRC/data/finecolour-colors.js" \
  "$G/color-palette/public/apps/color-palette/data/finecolour-colors.js" \
  "$G/thangka-trace/public/apps/thangka-trace/data/finecolour-colors.js" \
  "$I/public/apps/finecolour-color/data/finecolour-colors.js" \
  "$I/public/apps/color-palette/data/finecolour-colors.js" \
  "$I/public/apps/thangka-trace/data/finecolour-colors.js" \
  "$G/color-mixer/public/apps/color-mixer/data/finecolour-colors.js" \
  "$I/public/apps/color-mixer/data/finecolour-colors.js"

echo
if [ "$FAIL" -eq 0 ]; then echo "全部通過。"; else echo "有項目不一致（見上）。"; fi
exit "$FAIL"
