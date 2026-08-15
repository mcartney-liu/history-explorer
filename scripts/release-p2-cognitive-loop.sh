#!/usr/bin/env bash
# =====================================================================
# P2 认知闭环 · 发版脚本（Release Gate 执行用）
# ---------------------------------------------------------------------
# 严守发布铁律：
#   feature → ff-only merge master → annotated vM tag（真实时间）
#   → master + tag 分两次 push → ls-remote 复验 → consistency 7/7
# 禁：squash / rebase / reset / amend / force / 直接 master commit
# 统计一律引用 `git show --stat`，禁手维护。
#
# Release 永远翔哥拍板：
#   本脚本默认只做「核验 + 演练」，不碰远端。
#   真正发版须显式 CONFIRM_RELEASE=yes 才会 push。
# =====================================================================

set -euo pipefail

# ── 配置（由翔哥定）────────────────────────────────────────────
TAG="${TAG:-vM9-cognitive-loop}"                       # ← 真实 tag 名由翔哥定，例 vM9-XXX
BRANCH_PLAN="plan/next-phase"
REMOTE="origin"
EXPECTED_TIP="${EXPECTED_TIP:-41e613c53974d220d153f8d49b0dd68d990a772d}"   # 本回合实时核验值

# ── 公司 MITM 代理（推 github 报证书吊销 CRYPT_E_REVOCATION_OFFLINE 时启用）──
#   运行：GIT_NET_OPTS="-c http.sslBackend=openssl -c http.sslVerify=false" bash $0
: "${GIT_NET_OPTS:=}"
GIT_NET=($GIT_NET_OPTS)

echo "== [1] fetch =="
git "${GIT_NET[@]}" fetch "$REMOTE"

echo "== [2] 复核 plan/next-phase tip =="
PLAN_TIP=$(git "${GIT_NET[@]}" ls-remote "$REMOTE" "$BRANCH_PLAN" | awk '{print $1}')
echo "plan/next-phase tip = $PLAN_TIP"
if [[ "$PLAN_TIP" != "$EXPECTED_TIP" ]]; then
  echo "✗ tip 不符预期（$PLAN_TIP != $EXPECTED_TIP），停止发版。" >&2
  exit 1
fi

echo "== [3] 一致性预览（consistency 7/7 源头：引用 git show --stat，禁手维护）=="
git log --oneline "$PLAN_TIP" -8

# ── 闸门：未确认不发版 ─────────────────────────────────────────
if [[ "${CONFIRM_RELEASE:-no}" != "yes" ]]; then
  echo ""
  echo "⏸  核验完成，未执行发版（CONFIRM_RELEASE != yes）。"
  echo "    确认无误后运行："
  echo "      CONFIRM_RELEASE=yes TAG=$TAG bash $0"
  exit 0
fi

echo "== [4] checkout master =="
git checkout master

echo "== [5] ff-only merge plan/next-phase =="
if ! git merge --ff-only "$REMOTE/$BRANCH_PLAN"; then
  echo "✗ 非 fast-forward，停止（按铁律不得 rebase/squash）。请检查 master 是否已超前。" >&2
  exit 1
fi

echo "== [6] annotated tag（真实时间）=="
git tag -a "$TAG" -m "Release: P2 认知闭环 ①②③ 闭环 (M89入口 / Gap底座 / 7态闭环)"

echo "== [7] 双 push：先 master，再 tag =="
git "${GIT_NET[@]}" push "$REMOTE" master
git "${GIT_NET[@]}" push "$REMOTE" "$TAG"

echo "== [8] ls-remote 复验 =="
git "${GIT_NET[@]}" ls-remote "$REMOTE" master
git "${GIT_NET[@]}" ls-remote "$REMOTE" --tags "$TAG"

echo "== [9] consistency 7/7（引用 git show --stat，禁手维护）=="
git show --stat HEAD

echo ""
echo "✅ 发版完成：$TAG  →  master + tag 已推，tip 复核一致。"
