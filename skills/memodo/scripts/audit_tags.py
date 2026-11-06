#!/usr/bin/env python3
"""审计 memodo 的标签：对照五条标签原则，给出调整建议。

只读：脚本不访问网络、不修改任何 memo，只处理传入的 JSON 快照。

用法：
    python3 audit_tags.py snapshot.json
    python3 audit_tags.py snapshot.json --json suggestions.json
    python3 audit_tags.py snapshot.json --limit 20 --format md

输入 JSON 结构（用 MCP 拉取后落盘）：

    {
      "memos": [
        {"name": "memos/abc", "content": "#一级/二级\\n\\n正文", "state": "NORMAL",
         "tags": ["一级/二级"], "plan_start_time": 1767225600}
      ],
      "tags": [{"tag": "一级/二级", "count": 12}]
    }

范围：只审计 state == "NORMAL" 的 memo（未完成、未归档）。
注意 list_memos(state: "NORMAL") 会把 COMPLETED 一起返回，所以必须按 state 再过滤一次。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict

# 每条 memo 最多列出的问题数，避免报告过长
MAX_ISSUES_PER_MEMO = 3

CONFIDENCE_ORDER = {"high": 0, "medium": 1, "low": 2}

ISSUE_TITLES = {
    "NO_TAG": "没有标签（原则 3）",
    "MULTI_TAG": "挂了多个标签（原则 2）",
    "DEPTH_TOO_SHALLOW": "层数少于树的主体（原则 1）",
    "MID_LAYER": "挂在中间层（原则 5）",
    "LOW_REUSE": "只被一条 memo 使用的生僻分支（原则 4）",
    "SYNONYM": "疑似同义标签（原则 4）",
}


def depth(tag: str) -> int:
    """标签层级深度：`a/b/c` 为 3 层。"""
    return tag.count("/") + 1


def build_findings(memos: list[dict], tag_counts: dict[str, int]) -> tuple[list[dict], dict]:
    """按五条原则逐条检查，返回 (findings, stats)。"""
    all_tags = sorted(tag_counts)
    depth_dist = Counter(depth(t) for t in all_tags)
    mode_depth = depth_dist.most_common(1)[0][0] if depth_dist else 1
    children_of = {t: [x for x in all_tags if x.startswith(t + "/")] for t in all_tags}

    # 同义标签组：大小写折叠相同，或 __ 与 / 两种写法等价
    canonical = defaultdict(set)
    for t in all_tags:
        canonical[t.casefold().replace("__", "/")].add(t)
    synonym_groups = [sorted(v) for v in canonical.values() if len(v) > 1]

    findings: list[dict] = []
    for memo in memos:
        name = memo.get("name", "?")
        content = memo.get("content") or ""
        tags = [t for t in (memo.get("tags") or []) if t]

        def add(issue: str, detail: str, suggestion: str, confidence: str, needs_user: bool) -> None:
            findings.append({
                "memo": name,
                "issue": issue,
                "detail": detail,
                "suggestion": suggestion,
                "confidence": confidence,
                "needs_user": needs_user,
            })

        # 原则 3：每条都该有标签
        if not tags:
            add("NO_TAG", "正文里没有任何标签",
                "从标签树里挑 2-4 个语义接近的候选，问用户要挂哪个",
                "high", True)
            continue

        # 原则 2：一般只打一个
        if len(tags) > 1:
            add("MULTI_TAG", f"共 {len(tags)} 个标签：{'、'.join(tags)}",
                "确认是否真的横跨两个独立分支；否则收敛成主分支的一个",
                "medium", True)

        # 原则 1 / 5：层数与位置
        for t in tags:
            d = depth(t)
            children = children_of.get(t, [])
            # 只有当子分支已经承载了主要用量时，挂在父级才真的"没下沉"。
            # 父级自己就是主用节点（子分支总共没几条）时，它是合理的归档位置。
            child_total = sum(tag_counts.get(c, 0) for c in children)
            parent_total = tag_counts.get(t, 0)
            needs_sink = bool(children) and child_total >= parent_total
            if needs_sink:
                add("MID_LAYER",
                    f"`{t}` 下 {len(children)} 个子分支合计 {child_total} 条，已超过父级的 {parent_total} 条",
                    f"看正文是否明显属于某个子分支，是则下沉；纯杂项保留在 `{t}`",
                    "medium", True)
            elif d < mode_depth:
                add("DEPTH_TOO_SHALLOW",
                    f"`{t}` 是 {d} 层，树的主体是 {mode_depth} 层",
                    f"在已有分支里找更贴近的下级，或与用户确认是否保留为特例",
                    "medium", True)

            # 原则 4：生僻分支。有子分支的是分组容器，或已建议下沉的，都不再提归并。
            if not children and not needs_sink and tag_counts.get(t, 0) <= 1:
                siblings = [x for x in all_tags
                            if x != t and x.startswith(t.rsplit("/", 1)[0] + "/")]
                if siblings:
                    add("LOW_REUSE",
                        f"`{t}` 只被 1 条 memo 使用，同级还有 {len(siblings)} 个分支",
                        f"考虑归并到用量更高的同级分支（如 {siblings[0]}）",
                        "low", True)

            # 原则 4：同义写法
            for group in synonym_groups:
                if t in group and len(group) > 1:
                    add("SYNONYM",
                        f"`{t}` 与 {', '.join('`%s`' % x for x in group if x != t)} 写法等价",
                        "统一成一种写法，批量改写引用它的 memo",
                        "high", True)

    # 每条 memo 最多保留 MAX_ISSUES_PER_MEMO 条，优先高置信度
    trimmed = []
    by_memo = defaultdict(list)
    for f in findings:
        by_memo[f["memo"]].append(f)
    for items in by_memo.values():
        items.sort(key=lambda x: CONFIDENCE_ORDER.get(x["confidence"], 9))
        trimmed.extend(items[:MAX_ISSUES_PER_MEMO])

    stats = {
        "memos_audited": len(memos),
        "tags_total": len(all_tags),
        "depth_distribution": dict(sorted(depth_dist.items())),
        "mode_depth": mode_depth,
        "synonym_groups": synonym_groups,
        "issue_counts": dict(Counter(f["issue"] for f in trimmed)),
        "memos_with_issues": len({f["memo"] for f in trimmed}),
    }
    return trimmed, stats


def render_markdown(findings: list[dict], stats: dict, skipped: dict[str, int], limit: int) -> str:
    out: list[str] = []
    out.append("# memodo 标签审计报告")
    out.append("")
    out.append("范围：未完成、未归档（state=NORMAL）的 memo。仅给建议，未修改任何数据。")
    out.append("")
    out.append("## 概览")
    out.append("")
    out.append(f"- 审计 memo：**{stats['memos_audited']}** 条"
               f"（另有 {sum(skipped.values())} 条已完成/已归档，不在范围内）")
    if skipped:
        out.append(f"  - 排除明细：{', '.join(f'{k}={v}' for k, v in skipped.items())}")
    out.append(f"- 标签总数：**{stats['tags_total']}** 个，层级分布 "
               f"{stats['depth_distribution']}，主体深度 **{stats['mode_depth']}**")
    out.append(f"- 有问题的 memo：**{stats['memos_with_issues']}** 条，"
               f"共 {sum(stats['issue_counts'].values())} 条问题")
    out.append("")

    if stats["synonym_groups"]:
        out.append("### 同义标签组（优先处理）")
        out.append("")
        for group in stats["synonym_groups"]:
            out.append("- " + " 与 ".join(f"`{g}`" for g in group))
        out.append("")

    out.append("## 问题分布")
    out.append("")
    out.append("| 问题 | 数量 |")
    out.append("|---|---|")
    for issue, count in sorted(stats["issue_counts"].items(), key=lambda kv: -kv[1]):
        out.append(f"| {ISSUE_TITLES.get(issue, issue)} | {count} |")
    out.append("")

    grouped = defaultdict(list)
    for f in findings:
        grouped[f["issue"]].append(f)

    for issue in [i for i in ISSUE_TITLES if i in grouped]:
        items = grouped[issue]
        out.append(f"## {ISSUE_TITLES[issue]}")
        out.append("")
        out.append(f"共 {len(items)} 条。")
        out.append("")
        for f in items[:limit]:
            out.append(f"- `{f['memo']}` — {f['detail']}")
            out.append(f"  - 建议：{f['suggestion']}")
        if len(items) > limit:
            out.append(f"- …另有 {len(items) - limit} 条，用 `--limit` 调整或看 JSON 输出")
        out.append("")

    out.append("## 下一步")
    out.append("")
    out.append("1. 先把「同义标签组」和「没有标签」两类交给用户确认 —— 这两类需要人的判断，不宜自动改。")
    out.append("2. 确认后再按 SKILL.md 第 8 节的纪律执行：备份 → 单条验证 → 分批 → 复核。")
    out.append("3. 本报告不含任何写操作；脚本自身从不调用 MCP。")
    out.append("")
    return "\n".join(out)


def main() -> int:
    parser = argparse.ArgumentParser(description="审计 memodo 标签，输出调整建议（只读）")
    parser.add_argument("snapshot", help="包含 memos 与 tags 的 JSON 快照")
    parser.add_argument("--json", dest="json_out", help="把结构化建议写到这个文件")
    parser.add_argument("--limit", type=int, default=10, help="每个问题类型最多展示多少条（默认 10）")
    args = parser.parse_args()

    try:
        with open(args.snapshot, encoding="utf-8") as fh:
            data = json.load(fh)
    except OSError as exc:
        print(f"读取快照失败：{exc}", file=sys.stderr)
        return 2
    except json.JSONDecodeError as exc:
        print(f"快照不是合法 JSON：{exc}", file=sys.stderr)
        return 2

    raw_memos = data.get("memos") or []
    tag_counts = {t["tag"]: int(t.get("count", 0)) for t in (data.get("tags") or []) if t.get("tag")}

    skipped = Counter(m.get("state", "NORMAL") for m in raw_memos if m.get("state", "NORMAL") != "NORMAL")
    pending = [m for m in raw_memos if m.get("state", "NORMAL") == "NORMAL"]

    if not pending:
        print("没有需要审计的 memo（全部已完成或已归档）。", file=sys.stderr)
        return 0

    findings, stats = build_findings(pending, tag_counts)

    print(render_markdown(findings, stats, dict(skipped), args.limit))
    print(
        f"[摘要] 审计 {stats['memos_audited']} 条，"
        f"{stats['memos_with_issues']} 条有建议，共 {len(findings)} 条问题。",
        file=sys.stderr,
    )

    if args.json_out:
        payload = {
            "scope": "state == NORMAL (未完成、未归档)",
            "skipped": dict(skipped),
            "stats": stats,
            "suggestions": findings,
        }
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
        print(f"[输出] 结构化建议已写入 {args.json_out}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
