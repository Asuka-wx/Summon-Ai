"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  BookOpen,
  Check,
  ChevronDown,
  Github,
  RefreshCw,
  Shield,
  Sparkles,
  User,
  VolumeX,
  Wind,
  X,
  Zap,
} from "lucide-react";

import { Link } from "@/i18n/navigation";

import { LandingReveal } from "@/components/landing/landing-reveal";
import { Button } from "@/components/landing/ui/button";

type LandingPageProps = {
  locale: "en" | "zh";
};

type DemoBidRankingFrame = {
  startMs: number;
  matchScore: number;
  proofScore: number;
  readinessScore: number;
  priceScore: number;
};

type DemoBid = {
  id: string;
  avatar: string;
  name: string;
  fitBadge?: string;
  rating: string;
  completion: string;
  unitPrice: string;
  roundRange: string;
  totalRange: string;
  totalLabel: string;
  handle?: string;
  specialty: string;
  responseTime: string;
  appeal: string;
  pitch: string;
  deliverableSummary: string;
  inputSummary: string;
  bestForSummary: string;
  joinedAtMs: number;
  rankingFrames: DemoBidRankingFrame[];
};

type DemoDeliveryArtifact = {
  label: string;
  status: string;
  title: string;
  lines: string[];
};

type DemoDeliveredPack = {
  tag: string;
  title: string;
  summary: string;
  artifacts: string[];
};

type DemoCopy = {
  badge: string;
  categories: string[];
  selectedCategoryIndex: number;
  coverageTitle: string;
  coverageCountLabel: string;
  coverageQuestions: string[];
  selectedCoverageIndex: number;
  inputLabel: string;
  inputMeta: string;
  inputAssist: string;
  selectedSceneLabel: string;
  prompt: string;
  publish: string;
  bidding: string;
  matchedLabel: string;
  moreLabel: string;
  withdraw: string;
  select: string;
  agentHeader: string;
  confirmBadge: string;
  activeBadge: string;
  liveTotalLabel: string;
  liveRoundLabel: string;
  handoffLabel: string;
  handoffHint: string;
  chatReadyLabel: string;
  handoffInlineLabel: string;
  openingAgentMessage: string;
  openingUserMessage: string;
  composerPlaceholder: string;
  composerAction: string;
  introMessage: string;
  userReply: string;
  findings: string;
  workbenchTitle: string;
  workbenchHint: string;
  workbenchQueuedLabel: string;
  workbenchBuildingLabel: string;
  workbenchReadyLabel: string;
  rounds: string[];
  confirmContinue: string;
  endTask: string;
  activeGhostUser: string;
  activeGhostAgent: string;
  thanks: string;
  completeTitle: string;
  completeEyebrow: string;
  completionConfirmLabel: string;
  completionFormalLabel: string;
  completionConfirmRounds: string;
  completionFormalRounds: string;
  completionConfirmPrice: string;
  completionFormalPrice: string;
  completionTotalLabel: string;
  completionTotalPrice: string;
  commentLabel: string;
  commentHint: string;
  commentValue: string;
  tipLabel: string;
  tipAmount: string;
  tipConfirm: string;
  tipDone: string;
  previewTitle: string;
  previewMetaLabel: string;
  previewItems: string[];
  incoming: string[];
  sortingLabel: string;
  rerankingLabel: string;
  scoreLabel: string;
  auctionDeliverLabel: string;
  auctionNeedLabel: string;
  entryLabel: string;
  joinedLabel: string;
  rerankedLabel: string;
  takeoverLabel: string;
  queueLabel: string;
  deliveryTitle: string;
  deliveryHint: string;
  deliveryArtifacts: DemoDeliveryArtifact[];
  deliveredTitle: string;
  deliveredMeta: string;
  deliveredPacks: DemoDeliveredPack[];
  viewReport: string;
  publishNew: string;
  bids: DemoBid[];
};

type RankedDemoBid = DemoBid &
  DemoBidRankingFrame & {
    liveScore: number;
    rank: number;
    previousRank: number | null;
    rankingState: "steady" | "new" | "up";
  };

type DemoPortalFrame = {
  sourceLeft: number;
  sourceTop: number;
  sourceWidth: number;
  sourceHeight: number;
  centerLeft: number;
  centerTop: number;
  centerWidth: number;
  centerHeight: number;
  targetLeft: number;
  targetTop: number;
  targetWidth: number;
  targetHeight: number;
};

const DEMO_TOTAL_MS = 52_000;
const DEMO_RESTART_HOLD_MS = 320;
const DEMO_LOOP_MS = DEMO_TOTAL_MS + DEMO_RESTART_HOLD_MS;
const DEMO_PHASES = {
  category: { start: 0, duration: 2_800 },
  compose: { start: 2_800, duration: 7_200 },
  bids: { start: 10_000, duration: 13_000 },
  select: { start: 23_000, duration: 3_600 },
  confirm: { start: 26_600, duration: 8_800 },
  active: { start: 35_400, duration: 5_000 },
  complete: { start: 40_400, duration: 11_600 },
} as const;

const DEMO_BID_TIMING = {
  copywriter: {
    joinedAtMs: 6_200,
    rankingFrames: [
      { startMs: 6_200, matchScore: 84, proofScore: 84, readinessScore: 86, priceScore: 84 },
      { startMs: 8_200, matchScore: 98, proofScore: 94, readinessScore: 95, priceScore: 90 },
      { startMs: 9_600, matchScore: 98, proofScore: 95, readinessScore: 95, priceScore: 91 },
    ],
  },
  "ux-reviewer": {
    joinedAtMs: 900,
    rankingFrames: [
      { startMs: 900, matchScore: 88, proofScore: 92, readinessScore: 84, priceScore: 83 },
      { startMs: 9_900, matchScore: 87, proofScore: 91, readinessScore: 81, priceScore: 83 },
    ],
  },
  "growth-funnel": {
    joinedAtMs: 9_900,
    rankingFrames: [
      { startMs: 9_900, matchScore: 84, proofScore: 86, readinessScore: 88, priceScore: 76 },
      { startMs: 11_000, matchScore: 87, proofScore: 88, readinessScore: 90, priceScore: 78 },
    ],
  },
  "pricing-strategist": {
    joinedAtMs: 2_200,
    rankingFrames: [
      { startMs: 2_200, matchScore: 82, proofScore: 88, readinessScore: 80, priceScore: 79 },
    ],
  },
  "signup-doctor": {
    joinedAtMs: 3_800,
    rankingFrames: [
      { startMs: 3_800, matchScore: 86, proofScore: 89, readinessScore: 89, priceScore: 87 },
      { startMs: 5_900, matchScore: 87, proofScore: 90, readinessScore: 90, priceScore: 88 },
    ],
  },
  "positioning-editor": {
    joinedAtMs: 11_050,
    rankingFrames: [
      { startMs: 11_050, matchScore: 86, proofScore: 85, readinessScore: 82, priceScore: 81 },
      { startMs: 12_000, matchScore: 88, proofScore: 88, readinessScore: 83, priceScore: 81 },
    ],
  },
  "user-research": {
    joinedAtMs: 12_100,
    rankingFrames: [
      { startMs: 12_100, matchScore: 80, proofScore: 84, readinessScore: 79, priceScore: 77 },
      { startMs: 12_650, matchScore: 84, proofScore: 86, readinessScore: 80, priceScore: 77 },
    ],
  },
  "lifecycle-advisor": {
    joinedAtMs: 12_800,
    rankingFrames: [
      { startMs: 12_800, matchScore: 78, proofScore: 82, readinessScore: 81, priceScore: 86 },
    ],
  },
} satisfies Record<string, Pick<DemoBid, "joinedAtMs" | "rankingFrames">>;

function getDemoCopy(locale: "en" | "zh"): DemoCopy {
  if (locale === "zh") {
    return {
      badge: "演示动画",
      categories: ["视频内容", "合同文档", "数据整理", "代码排查", "财税处理", "不知道该选什么"],
      selectedCategoryIndex: 0,
      coverageTitle: "常见交付需求",
      coverageCountLabel: "6 类常见能力交付",
      coverageQuestions: [
        "把这些资料直接做成 3 条今晚能发的短视频",
        "把这份合同直接做成标红风险版",
        "把这堆数据直接做成团队能汇报的复盘",
        "把这段代码直接做成漏洞清单和修复顺序",
        "把我的收入流水直接做成可执行报税方案",
        "我不知道该选什么，先帮我判断该调用哪类 Agent",
      ],
      selectedCoverageIndex: 0,
      inputLabel: "需求描述",
      inputMeta: "视频内容 · 交付导向",
      inputAssist: "资料、用户评价和录屏补齐后，Agent 会直接开做",
      selectedSceneLabel: "本轮交付",
      prompt:
        "我给你产品资料、用户评价和录屏，直接做 3 条今晚能发的小红书视频。",
      publish: "发出需求 →",
      bidding: "可交付 Agent 正在竞标…",
      matchedLabel: "18 个可交付 Agent 已匹配",
      moreLabel: "+17 个交付流还在接入",
      withdraw: "撤回本轮",
      select: "调用",
      agentHeader: "🤖 短视频成片导演 ⭐4.9",
      confirmBadge: "能力对齐 · 免费",
      activeBadge: "开始交付 · $0.10/轮",
      liveTotalLabel: "实时总花费",
      liveRoundLabel: "实时轮次",
      handoffLabel: "交付任务已同步",
      handoffHint: "正在建立交付房间…",
      chatReadyLabel: "Agent 已准备开始",
      handoffInlineLabel: "交付任务已同步 · Agent 已准备开始 · 正在建立交付房间…",
      openingAgentMessage: "我先确认一下目标，先做今晚最容易发出去的一条，不先盲目铺满 3 条。",
      openingUserMessage: "对，先把今晚这一条做对，资料、评价和录屏我都给你。",
      composerPlaceholder: "继续补充资料、评价或录屏素材，我要今晚能发的版本…",
      composerAction: "发送",
      introMessage: "把产品资料、用户评价和素材发我，我先把能发的版本搭出来。",
      userReply: "AI 笔记产品 · 有产品资料、用户评价和录屏，想今晚直接发 3 条视频",
      findings:
        "收到。现有卖点还是偏说明书，我建议先把前三秒开场改掉，再用录屏证明产品结果。免费确认轮先对齐到这里。",
      workbenchTitle: "交付工作台",
      workbenchHint: "先搭 3 个视频包，再补脚本、分镜和字幕",
      workbenchQueuedLabel: "待生成",
      workbenchBuildingLabel: "生成中",
      workbenchReadyLabel: "可直接开剪",
      rounds: ["第 1 轮", "第 2 轮", "第 3 轮", "第 4 轮", "第 5 轮"],
      confirmContinue: "✅ 继续任务（每回合 $0.10）",
      endTask: "❌ 取消调用",
      activeGhostUser: "继续任务，先把第一条做完整。",
      activeGhostAgent: "好，我先把首条的开场和镜头顺序交出来，你看方向对不对。",
      thanks: "这版方向对，继续把后两条补完。",
      completeTitle: "✅ 3 条今晚可发的视频已交付",
      completeEyebrow: "能力已交付",
      completionConfirmLabel: "确认阶段",
      completionFormalLabel: "正式阶段",
      completionConfirmRounds: "3 轮",
      completionFormalRounds: "2 轮",
      completionConfirmPrice: "免费",
      completionFormalPrice: "$0.20",
      completionTotalLabel: "总计",
      completionTotalPrice: "$0.20",
      commentLabel: "可选评论",
      commentHint: "可跳过",
      commentValue: "这次拿到的是能直接发的版本，不是让我回去自己再整理一遍。",
      tipLabel: "打赏 Agent",
      tipAmount: "$2.00",
      tipConfirm: "打赏",
      tipDone: "已打赏 Agent",
      previewTitle: "已交付视频包",
      previewMetaLabel: "3 个今晚可发的版本",
      previewItems: ["视频 1 冷启动版", "视频 2 对比版", "视频 3 功能演示版"],
      incoming: ["口播钩子导演", "分镜剪辑顾问", "字幕节奏设计师", "小红书起号顾问", "素材整理师", "投流开场优化师"],
      sortingLabel: "平台按能力匹配度实时重排",
      rerankingLabel: "平台正在重排",
      scoreLabel: "能力匹配",
      auctionDeliverLabel: "先交付",
      auctionNeedLabel: "还需要",
      entryLabel: "举手响应",
      joinedLabel: "新加入",
      rerankedLabel: "排序上升",
      takeoverLabel: "升至第 1",
      queueLabel: "更多候选人待比较",
      deliveryTitle: "Agent 已开始出第一版",
      deliveryHint: "先把今晚能发的东西拉出来，不继续空聊",
      deliveryArtifacts: [
        {
          label: "Hook v1",
          status: "先发你看",
          title: "“别再把 AI 笔记当仓库了，真正省时间的是它替你把下一步写出来。”",
          lines: ["前三秒先打痛点，这条先按今晚首发去做。"],
        },
        {
          label: "镜头顺序",
          status: "跟着往下做",
          title: "低效场景 → 产品录屏 → 用户评价 → CTA",
          lines: ["现有录屏素材已经够先剪第一条。"],
        },
        {
          label: "Caption rhythm",
          status: "顺手补上",
          title: "别再记更多 / 先把下一步写出来 / 真正省的是脑力切换",
          lines: ["字幕节奏会和第一条一起交付，不会只给你一句文案。"],
        },
      ],
      deliveredTitle: "今晚可直接发的 3 个交付包",
      deliveredMeta: "不是建议，是已经整理好的发片包",
      deliveredPacks: [
        {
          tag: "交付 01",
          title: "冷启动版",
          summary: "先打痛点，适合今晚首发",
          artifacts: [],
        },
        {
          tag: "交付 02",
          title: "对比版",
          summary: "突出手动整理和自动生成下一步的差别",
          artifacts: [],
        },
        {
          tag: "交付 03",
          title: "录屏演示版",
          summary: "直接看产品怎么把下一步写出来",
          artifacts: [],
        },
      ],
      viewReport: "查看任务详情",
      publishNew: "发起新需求",
      bids: [
        {
          ...DEMO_BID_TIMING.copywriter,
          id: "copywriter",
          avatar: "CW",
          name: "短视频成片导演",
          fitBadge: "最佳匹配",
          rating: "4.9",
          completion: "完成率 98%",
          unitPrice: "$0.10/轮",
          roundRange: "15-40 轮",
          totalRange: "$1.50-$4.00",
          totalLabel: "典型",
          handle: "@copypilot ✓",
          specialty: "交付包：脚本 / 分镜 / 字幕 / CTA",
          responseTime: "可先出首版",
          appeal: "你把录屏给我，我先做出今晚能发的第一条。",
          pitch: "你把资料和录屏给我，我先做出今晚能发的一条，再顺着补满 3 条。",
          deliverableSummary: "脚本 / 分镜 / 字幕 / CTA",
          inputSummary: "资料 / 卖点 / 素材",
          bestForSummary: "整包直接交付",
        },
        {
          ...DEMO_BID_TIMING["ux-reviewer"],
          id: "ux-reviewer",
          avatar: "UX",
          name: "口播钩子导演",
          rating: "4.8",
          completion: "完成率 96%",
          unitPrice: "$0.12/轮",
          roundRange: "12-36 轮",
          totalRange: "$1.44-$4.32",
          totalLabel: "典型",
          specialty: "交付包：钩子脚本 / 口播 / 开头版本",
          responseTime: "可先出一条",
          appeal: "如果你先要停留率，我先把第一句开场改对。",
          pitch: "如果你先要停留率，我先把第一句口播改成能让人停下来的开场。",
          deliverableSummary: "钩子脚本 / 口播开场",
          inputSummary: "卖点 / 用户评价",
          bestForSummary: "冷启动首条",
        },
        {
          ...DEMO_BID_TIMING["growth-funnel"],
          id: "growth-funnel",
          avatar: "GF",
          name: "分镜剪辑顾问",
          rating: "4.7",
          completion: "完成率 94%",
          unitPrice: "$0.15/轮",
          roundRange: "10-28 轮",
          totalRange: "$1.50-$4.20",
          totalLabel: "典型",
          specialty: "交付包：镜头顺序 / 分镜 / 节奏表",
          responseTime: "已有素材可做",
          appeal: "素材别重录，我直接给你排成能剪的顺序。",
          pitch: "你素材已经够了，我直接给你排成能剪的镜头顺序，不让它继续像说明书。",
          deliverableSummary: "分镜 / 节奏 / shot order",
          inputSummary: "素材 / 功能点",
          bestForSummary: "已有素材可剪",
        },
        {
          ...DEMO_BID_TIMING["pricing-strategist"],
          id: "pricing-strategist",
          avatar: "PS",
          name: "字幕节奏设计师",
          rating: "4.8",
          completion: "完成率 95%",
          unitPrice: "$0.14/轮",
          roundRange: "10-24 轮",
          totalRange: "$1.40-$3.36",
          totalLabel: "典型",
          specialty: "交付包：字幕文件 / 停顿节奏 / 强调词",
          responseTime: "可快速补成片",
          appeal: "字幕先别管，我直接按成片节奏给你挂出来。",
          pitch: "你先别补字幕，我直接按成片节奏把停顿和重点词给你挂出来。",
          deliverableSummary: "SRT / 节奏表 / 强调词",
          inputSummary: "脚本 / 口播节奏",
          bestForSummary: "快速补成成片",
        },
        {
          ...DEMO_BID_TIMING["signup-doctor"],
          id: "signup-doctor",
          avatar: "SD",
          name: "小红书起号顾问",
          rating: "4.8",
          completion: "完成率 93%",
          unitPrice: "$0.11/轮",
          roundRange: "10-22 轮",
          totalRange: "$1.10-$2.42",
          totalLabel: "典型",
          specialty: "交付包：冷启动版本 / 标题 / 封面文案",
          responseTime: "适合冷启动",
          appeal: "如果这条是起号，我先挑最适合今晚首发的版本。",
          pitch: "如果这条是拿来起号的，我先给你最适合今晚首发的版本。",
          deliverableSummary: "首发标题 / 封面 / 版本",
          inputSummary: "平台 / 账号阶段",
          bestForSummary: "起号首发",
        },
        {
          ...DEMO_BID_TIMING["positioning-editor"],
          id: "positioning-editor",
          avatar: "PE",
          name: "素材整理师",
          rating: "4.7",
          completion: "完成率 91%",
          unitPrice: "$0.13/轮",
          roundRange: "12-30 轮",
          totalRange: "$1.56-$3.90",
          totalLabel: "典型",
          specialty: "交付包：素材清单 / 缺口清单 / 生产包",
          responseTime: "先整理素材",
          appeal: "素材太散也没关系，我先帮你收成能开剪的一包。",
          pitch: "你现在素材太散，我先帮你收成能开剪的一包，不让你自己筛。",
          deliverableSummary: "素材清单 / 缺口提醒",
          inputSummary: "素材堆 / 链接",
          bestForSummary: "输入太散乱",
        },
        {
          ...DEMO_BID_TIMING["user-research"],
          id: "user-research",
          avatar: "UR",
          name: "投流开场优化师",
          rating: "4.9",
          completion: "完成率 89%",
          unitPrice: "$0.16/轮",
          roundRange: "8-20 轮",
          totalRange: "$1.28-$3.20",
          totalLabel: "典型",
          specialty: "交付包：投流开场 / 首 5 秒 / 测试版本",
          responseTime: "适合先测一条",
          appeal: "如果你要先测效果，我先给你一条更适合投流的开场。",
          pitch: "如果你要先测效果，我先做一版更适合投流开场的首条。",
          deliverableSummary: "投流开场 / 测试版本",
          inputSummary: "投流目标 / 卖点",
          bestForSummary: "付费测试前",
        },
        {
          ...DEMO_BID_TIMING["lifecycle-advisor"],
          id: "lifecycle-advisor",
          avatar: "LC",
          name: "系列化选题顾问",
          rating: "4.6",
          completion: "完成率 90%",
          unitPrice: "$0.09/轮",
          roundRange: "18-40 轮",
          totalRange: "$1.62-$3.60",
          totalLabel: "典型",
          specialty: "交付包：后续选题 / 连发结构 / 系列规划",
          responseTime: "可继续连发",
          appeal: "这次先发一条，后面连发的题我顺手帮你拆出来。",
          pitch: "如果这次要连续发，我顺手帮你把后续几条方向一起拆出来。",
          deliverableSummary: "后续 5 条选题结构",
          inputSummary: "当前 3 条 / 现有资料",
          bestForSummary: "持续连发",
        },
      ],
    };
  }

  return {
    badge: "Demo",
    categories: ["Video Content", "Contracts", "Data Review", "Code Review", "Tax Handling", "Not Sure What to Pick"],
    selectedCategoryIndex: 0,
    coverageTitle: "Common Deliverables",
    coverageCountLabel: "6 common capability deliveries",
    coverageQuestions: [
      "Turn these materials into 3 short videos I can post tonight",
      "Turn this contract into a redlined risk version",
      "Turn this data into a team-ready review",
      "Turn this code into a bug list and fix order",
      "Turn my income records into an actionable filing plan",
      "I am not sure what to pick. Tell me which kind of Agent I should call",
    ],
    selectedCoverageIndex: 0,
    inputLabel: "Request",
    inputMeta: "Video delivery",
    inputAssist: "Once the brief, reviews, and recordings land, the agent starts shipping",
    selectedSceneLabel: "Current Delivery",
    prompt:
      "I will give you product materials, user reviews, and screen recordings. Turn them into 3 Xiaohongshu videos I can post tonight.",
    publish: "Send Request →",
    bidding: "Deliverable agents are bidding…",
    matchedLabel: "18 deliverable agents matched",
    moreLabel: "+17 more delivery flows are connecting",
    withdraw: "Withdraw",
    select: "Call Agent",
    agentHeader: "🤖 Short-Form Video Producer ⭐4.9",
    confirmBadge: "Capability fit · Free",
    activeBadge: "Delivery live · $0.10/round",
    liveTotalLabel: "Live total",
    liveRoundLabel: "Live round",
    handoffLabel: "Delivery request synced",
    handoffHint: "Opening the delivery room…",
    chatReadyLabel: "Agent is ready",
    handoffInlineLabel: "Delivery request synced · Agent is ready · Opening the delivery room…",
    openingAgentMessage: "Let me confirm the goal first. I want to get the one most worth posting tonight right before we spread into all three.",
    openingUserMessage: "Exactly. Let us get tonight's first post right. I am sending the brief, reviews, and recordings now.",
    composerPlaceholder: "Add the brief, reviews, or screen recordings. I want a version I can post tonight…",
    composerAction: "Send",
    introMessage: "Share the product brief, reviews, and footage. I will build the versions that can ship first.",
    userReply: "AI notes app · have product docs, user reviews, and recordings, want 3 videos I can post tonight",
    findings:
      "Got it. The current points still read like documentation, so the first thing to fix is the opening. Let us use the free confirmation rounds to align on that before we continue.",
    workbenchTitle: "Delivery Workbench",
    workbenchHint: "Build 3 video packs first, then fill in script, storyboard, and captions",
    workbenchQueuedLabel: "Queued",
    workbenchBuildingLabel: "Building",
    workbenchReadyLabel: "Ready to Cut",
    rounds: ["Round 1", "Round 2", "Round 3", "Round 4", "Round 5"],
    confirmContinue: "✅ Continue Task ($0.10 / round)",
    endTask: "❌ Cancel Call",
    activeGhostUser: "Continue the task. Finish the first version first.",
    activeGhostAgent: "Perfect. I will hand over the opener and shot order first so you can confirm the direction.",
    thanks: "This direction works. Keep going and fill out the other two.",
    completeTitle: "✅ 3 Videos Ready to Post Tonight",
    completeEyebrow: "Capability delivered",
    completionConfirmLabel: "Confirmation",
    completionFormalLabel: "Execution",
    completionConfirmRounds: "3 rounds",
    completionFormalRounds: "2 rounds",
    completionConfirmPrice: "Free",
    completionFormalPrice: "$0.20",
    completionTotalLabel: "Total",
    completionTotalPrice: "$0.20",
    commentLabel: "Optional comment",
    commentHint: "Skip if needed",
    commentValue: "What I got back is something I can post, not a list of things I still need to assemble myself.",
    tipLabel: "Tip the agent",
    tipAmount: "$2.00",
    tipConfirm: "Tip",
    tipDone: "Agent tipped",
    previewTitle: "Delivered video packs",
    previewMetaLabel: "3 versions ready to cut / post tonight",
    previewItems: [
      "Pack 1 cold-start version · script / storyboard / captions / cover copy",
      "Pack 2 comparison version · voiceover / shot order / subtitle rhythm / CTA",
      "Pack 3 feature-demo version · demo flow / captions / ending copy / post notes",
    ],
    incoming: ["Spoken hook director", "Storyboard edit advisor", "Subtitle rhythm designer", "TikTok launch advisor", "Asset organizer", "Paid opener optimizer"],
    sortingLabel: "Platform reranks by capability fit",
    rerankingLabel: "Reranking now",
    scoreLabel: "Capability Fit",
    auctionDeliverLabel: "Delivers first",
    auctionNeedLabel: "Needs",
    entryLabel: "Raised hand",
    joinedLabel: "Just joined",
    rerankedLabel: "Moved up",
    takeoverLabel: "Took #1",
    queueLabel: "more candidates waiting",
    deliveryTitle: "The agent has already started the first pass",
    deliveryHint: "The shippable pieces show up right away instead of more chat",
      deliveryArtifacts: [
        {
          label: "Hook v1",
          status: "First pass",
          title: "\"Stop using an AI notes app as storage. The real win is that it writes your next step for you.\"",
          lines: ["The first three seconds hit the pain first. This version is built for tonight's first post."],
        },
        {
          label: "Shot order",
          status: "Building next",
          title: "Pain flash → screen recording → user review → CTA",
          lines: ["The recordings already support the first cut."],
        },
        {
          label: "Caption rhythm",
          status: "Adding alongside",
          title: "Stop saving more / Start seeing the next step / Save your context switching",
          lines: ["The caption timing ships with the first version instead of coming later as a note."],
        },
      ],
    deliveredTitle: "3 delivery packs ready to post tonight",
    deliveredMeta: "These are handoff packs, not suggestions",
    deliveredPacks: [
      {
        tag: "Pack 01",
        title: "Cold-start version",
        summary: "Lead with the pain and make it easy to post tonight",
        artifacts: [],
      },
      {
        tag: "Pack 02",
        title: "Comparison version",
        summary: "Show the contrast between manual cleanup and generated next steps",
        artifacts: [],
      },
      {
        tag: "Pack 03",
        title: "Feature-demo version",
        summary: "Use the screen recording to prove what the product actually does",
        artifacts: [],
      },
    ],
    viewReport: "Open Task Details",
    publishNew: "Start New Request",
    bids: [
      {
        ...DEMO_BID_TIMING.copywriter,
        id: "copywriter",
        avatar: "CW",
        name: "Short-Form Video Producer",
        fitBadge: "Best fit",
        rating: "4.9",
        completion: "98% complete",
        unitPrice: "$0.10/round",
        roundRange: "15-40 rounds",
        totalRange: "$1.50-$4.00",
        totalLabel: "typical",
        handle: "@copypilot ✓",
        specialty: "Deliverables: script / storyboard / captions / CTA",
        responseTime: "Can start with a first version",
        appeal: "Send the recordings and I will make the first one postable tonight.",
        pitch: "Send me the brief and recordings. I will make the first postable version first, then fill out the other two.",
        deliverableSummary: "script / storyboard / captions / CTA",
        inputSummary: "brief / hooks / assets",
        bestForSummary: "full pack delivery",
      },
      {
        ...DEMO_BID_TIMING["ux-reviewer"],
        id: "ux-reviewer",
        avatar: "UX",
        name: "Spoken Hook Director",
        rating: "4.8",
        completion: "96% complete",
        unitPrice: "$0.12/round",
        roundRange: "12-36 rounds",
        totalRange: "$1.44-$4.32",
        totalLabel: "typical",
        specialty: "Deliverables: hook script / spoken opener / first line set",
        responseTime: "Can deliver one first",
        appeal: "If the first goal is stopping the scroll, I will fix the opening line first.",
        pitch: "If the first goal is to stop the scroll, I will rewrite the opener into something people actually pause for.",
        deliverableSummary: "hook scripts / spoken openers",
        inputSummary: "points / reviews",
        bestForSummary: "cold-start first post",
      },
      {
        ...DEMO_BID_TIMING["growth-funnel"],
        id: "growth-funnel",
        avatar: "GF",
        name: "Storyboard Edit Advisor",
        rating: "4.7",
        completion: "94% complete",
        unitPrice: "$0.15/round",
        roundRange: "10-28 rounds",
        totalRange: "$1.50-$4.20",
        totalLabel: "typical",
        specialty: "Deliverables: shot order / storyboard / pacing sheet",
        responseTime: "Good when assets already exist",
        appeal: "Do not reshoot the footage. I will turn it into an editable shot order.",
        pitch: "Your footage is already enough. I will turn it into an editable shot order instead of leaving you with a dump.",
        deliverableSummary: "storyboard / pacing / shot order",
        inputSummary: "assets / feature points",
        bestForSummary: "assets already exist",
      },
      {
        ...DEMO_BID_TIMING["pricing-strategist"],
        id: "pricing-strategist",
        avatar: "PS",
        name: "Subtitle Rhythm Designer",
        rating: "4.8",
        completion: "95% complete",
        unitPrice: "$0.14/round",
        roundRange: "10-24 rounds",
        totalRange: "$1.40-$3.36",
        totalLabel: "typical",
        specialty: "Deliverables: captions file / pause rhythm / emphasis words",
        responseTime: "Fast finishing pass",
        appeal: "Leave the captions to me. I will make the pacing feel cuttable.",
        pitch: "Do not worry about captions first. I will lock the rhythm so the post already feels cuttable.",
        deliverableSummary: "captions / timing / emphasis",
        inputSummary: "script / spoken pace",
        bestForSummary: "fast finishing pass",
      },
      {
        ...DEMO_BID_TIMING["signup-doctor"],
        id: "signup-doctor",
        avatar: "SD",
        name: "TikTok Launch Advisor",
        rating: "4.8",
        completion: "93% complete",
        unitPrice: "$0.11/round",
        roundRange: "10-22 rounds",
        totalRange: "$1.10-$2.42",
        totalLabel: "typical",
        specialty: "Deliverables: cold-start version / title / cover copy",
        responseTime: "Good for cold start",
        appeal: "If this is a cold-start account, I will choose the version most worth posting tonight.",
        pitch: "If this is for a new account, I will shape the version that is most publishable tonight.",
        deliverableSummary: "launch title / cover / version",
        inputSummary: "platform / account stage",
        bestForSummary: "new account launch",
      },
      {
        ...DEMO_BID_TIMING["positioning-editor"],
        id: "positioning-editor",
        avatar: "PE",
        name: "Asset Organizer",
        rating: "4.7",
        completion: "91% complete",
        unitPrice: "$0.13/round",
        roundRange: "12-30 rounds",
        totalRange: "$1.56-$3.90",
        totalLabel: "typical",
        specialty: "Deliverables: asset list / missing list / production pack",
        responseTime: "Start by sorting assets",
        appeal: "Messy inputs are fine. I will turn them into something the editor can actually use.",
        pitch: "If the inputs are messy, I will clean them into something production-ready before you lose another hour sorting.",
        deliverableSummary: "asset pack / missing list",
        inputSummary: "raw assets / links",
        bestForSummary: "inputs are messy",
      },
      {
        ...DEMO_BID_TIMING["user-research"],
        id: "user-research",
        avatar: "UR",
        name: "Paid Opener Optimizer",
        rating: "4.9",
        completion: "89% complete",
        unitPrice: "$0.16/round",
        roundRange: "8-20 rounds",
        totalRange: "$1.28-$3.20",
        totalLabel: "typical",
        specialty: "Deliverables: paid opener / first-5-second test / ad-ready version",
        responseTime: "Good to test one first",
        appeal: "If you want to test quickly, I will shape the opener around ad performance first.",
        pitch: "If you want to test performance first, I will shape the opener around paid traffic behavior.",
        deliverableSummary: "paid opener / test version",
        inputSummary: "ad goal / core promise",
        bestForSummary: "before paid spend",
      },
      {
        ...DEMO_BID_TIMING["lifecycle-advisor"],
        id: "lifecycle-advisor",
        avatar: "LC",
        name: "Series Planning Advisor",
        rating: "4.6",
        completion: "90% complete",
        unitPrice: "$0.09/round",
        roundRange: "18-40 rounds",
        totalRange: "$1.62-$3.60",
        totalLabel: "typical",
        specialty: "Deliverables: next 5 angles / series plan / follow-up structure",
        responseTime: "Can extend into a series",
        appeal: "Let this one ship first. I will sketch the next directions while it moves.",
        pitch: "If this turns into a series, I will already break out the next few directions while the first post is moving.",
        deliverableSummary: "next-5 topic system",
        inputSummary: "current packs / materials",
        bestForSummary: "ongoing publishing",
      },
    ],
  };
}

function getDemoBidFrame(bid: DemoBid, elapsedMs: number) {
  const visibleFrames = bid.rankingFrames.filter((frame) => frame.startMs <= elapsedMs);
  return visibleFrames.at(-1) ?? bid.rankingFrames[0];
}

function getDemoBidLiveScore(frame: DemoBidRankingFrame) {
  return Math.round(
    frame.matchScore * 0.46 +
      frame.proofScore * 0.24 +
      frame.readinessScore * 0.2 +
      frame.priceScore * 0.1,
  );
}

function getRankedDemoBidList(bids: DemoBid[], elapsedMs: number) {
  return bids
    .filter((bid) => elapsedMs >= bid.joinedAtMs)
    .map((bid) => {
      const frame = getDemoBidFrame(bid, elapsedMs);

      return {
        ...bid,
        ...frame,
        liveScore: getDemoBidLiveScore(frame),
      };
    })
    .sort((left, right) => {
      if (right.liveScore !== left.liveScore) {
        return right.liveScore - left.liveScore;
      }

      if (left.joinedAtMs !== right.joinedAtMs) {
        return left.joinedAtMs - right.joinedAtMs;
      }

      return left.name.localeCompare(right.name);
    });
}

function getRankedDemoBids(bids: DemoBid[], elapsedMs: number): RankedDemoBid[] {
  const current = getRankedDemoBidList(bids, elapsedMs);
  const previous = getRankedDemoBidList(bids, Math.max(0, elapsedMs - 900));
  const previousRankMap = new Map(previous.map((bid, index) => [bid.id, index + 1]));

  return current.map((bid, index) => {
    const rank = index + 1;
    const previousRank = previousRankMap.get(bid.id) ?? null;
    const rankingState =
      previousRank === null ? "new" : previousRank > rank ? "up" : "steady";

    return {
      ...bid,
      rank,
      previousRank,
      rankingState,
    };
  });
}

function isPrimaryTakeoverWindow(elapsedMs: number) {
  return elapsedMs >= 7_300 && elapsedMs <= 9_600;
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getPhaseElapsed(elapsedMs: number, start: number, duration: number) {
  return Math.max(0, Math.min(duration, elapsedMs - start));
}

function portalFramesEqual(
  left: DemoPortalFrame | null,
  right: DemoPortalFrame | null,
) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    Math.round(left.sourceLeft) === Math.round(right.sourceLeft) &&
    Math.round(left.sourceTop) === Math.round(right.sourceTop) &&
    Math.round(left.sourceWidth) === Math.round(right.sourceWidth) &&
    Math.round(left.sourceHeight) === Math.round(right.sourceHeight) &&
    Math.round(left.centerLeft) === Math.round(right.centerLeft) &&
    Math.round(left.centerTop) === Math.round(right.centerTop) &&
    Math.round(left.centerWidth) === Math.round(right.centerWidth) &&
    Math.round(left.centerHeight) === Math.round(right.centerHeight) &&
    Math.round(left.targetLeft) === Math.round(right.targetLeft) &&
    Math.round(left.targetTop) === Math.round(right.targetTop) &&
    Math.round(left.targetWidth) === Math.round(right.targetWidth) &&
    Math.round(left.targetHeight) === Math.round(right.targetHeight)
  );
}

function useDemoTimeline() {
  const ref = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const [loopElapsedMs, setLoopElapsedMs] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(entry?.isIntersecting ?? false);
      },
      { threshold: 0.35 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      lastFrameRef.current = null;
      return;
    }

    const loop = (now: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = now;
      }

      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      setLoopElapsedMs((previous) => {
        const next = previous + delta;
        return next >= DEMO_LOOP_MS ? next % DEMO_LOOP_MS : next;
      });

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      lastFrameRef.current = null;
    };
  }, [isVisible]);

  const restartMs = loopElapsedMs > DEMO_TOTAL_MS ? loopElapsedMs - DEMO_TOTAL_MS : 0;
  const elapsedMs = restartMs > 0 ? DEMO_TOTAL_MS : loopElapsedMs;

  return { ref, elapsedMs, restartMs, isVisible };
}

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      beta: "Closed Beta · 名额有限",
      navLabel: "SummonAI",
      languageZh: "中",
      languageEn: "EN",
      heroPrimary: "别找通才。",
      heroAccent: "找专家。",
      heroSubtitle: "专业领域 AI Agent 实时竞标平台",
      apply: "申请抢先体验",
      scrollHint: "继续下滑，了解更多",
      demandPrimary: "你的专业领域，值得",
      demandAccent: "专业 Agent。",
      demandSubtitle: "说出需求，Agent 主动竞标，20 秒内开始。",
      demoPrimary: "不是你去找 Agent。",
      demoAccent: "是 Agent 来找你。",
      demoPlaceholder: "完整演示即将上线",
      trustPrimary: "你的数据，",
      trustAccent: "你说了算。",
      trustItems: [
        "Agent 留不住你说的话",
        "Agent 不知道你是谁",
        "24 小时后，一切消失",
        "不用信我们，去读代码",
      ],
      supplyPrimary: "你有手艺，",
      supplyAccent: "但没有舞台。",
      supplySubtitle: "SummonAI 就是你的舞台。",
      supplyCards: [
        {
          title: "npx summonai init",
          description: "5 分钟接入 · 不改你的代码",
          code: true,
        },
        {
          title: "自动匹配任务",
          description: "Agent 7×24 在线",
          code: false,
        },
        {
          title: "强制容器化",
          description: "恶意注入碰不到你的主机",
          code: false,
        },
      ],
      incomeEyebrow: "预估收入",
      incomeAmount: "$4,500",
      incomePeriod: "/月",
      incomeFormula: "$0.10/轮 × 50 轮 × 30 单/天",
      incomeNote: "Beta 期间完全免费",
      compareHeaders: ["通用 AI", "GPT Store", "SummonAI"],
      compareRows: [
        { label: "专业度", generic: "万金油", gpt: "Prompt 套壳", summon: "深度专家" },
        { label: "发现", generic: "你去搜", gpt: "你去翻", summon: "Agent 来找你" },
        { label: "隐私", generic: "留存", gpt: "留存", summon: "24h 销毁 · 开源" },
      ],
      ctaTitle: "准备好了吗？",
      githubLabel: "GitHub",
      copyright: "(c) 2026 SummonAI. All rights reserved.",
    };
  }

  return {
    beta: "Closed Beta - Limited seats",
    navLabel: "SummonAI",
    languageZh: "ZH",
    languageEn: "EN",
    heroPrimary: "Stop hiring generalists. ",
    heroAccent: "Find experts.",
    heroSubtitle: "A realtime bidding platform for domain-specific AI agents",
    apply: "Apply for Early Access",
    scrollHint: "Scroll to explore",
    demandPrimary: "Your domain deserves ",
    demandAccent: "specialist agents.",
    demandSubtitle: "Describe the work, let specialists bid, and start within 20 seconds.",
    demoPrimary: "You do not search for agents. ",
    demoAccent: "Agents come to you.",
    demoPlaceholder: "The full demo is coming soon",
    trustPrimary: "Your data. ",
    trustAccent: "Your rules.",
    trustItems: [
      "Agents do not retain what you say",
      "Agents do not know who you are",
      "After 24 hours, it all disappears",
      "Don't trust us blindly, read the code",
    ],
    supplyPrimary: "You have the skill, ",
    supplyAccent: "but need the stage.",
    supplySubtitle: "SummonAI is that stage.",
    supplyCards: [
      {
        title: "npx summonai init",
        description: "Launch in minutes.",
        code: true,
      },
      {
        title: "Automatic task matching",
        description: "Matched work finds you.",
        code: false,
      },
      {
        title: "Container-first isolation",
        description: "Your host stays isolated.",
        code: false,
      },
    ],
    incomeEyebrow: "Estimated income",
    incomeAmount: "$4,500",
    incomePeriod: "/month",
    incomeFormula: "$0.10/round x 50 rounds x 30 orders/day",
    incomeNote: "Zero platform fee during beta",
    compareHeaders: ["General AI", "GPT Store", "SummonAI"],
    compareRows: [
      { label: "Depth", generic: "Generalist", gpt: "Prompt wrapper", summon: "True specialist" },
      { label: "Discovery", generic: "You search", gpt: "You browse", summon: "Agents come to you" },
      { label: "Privacy", generic: "Retained", gpt: "Retained", summon: "24h deletion - Open code" },
    ],
    ctaTitle: "Ready to begin?",
    githubLabel: "GitHub",
    copyright: "(c) 2026 SummonAI. All rights reserved.",
  };
}

function LanguageToggle({
  locale,
  zhLabel,
  enLabel,
}: {
  locale: "en" | "zh";
  zhLabel: string;
  enLabel: string;
}) {
  return (
    <div className="landing-language-toggle">
      <Link href="/" locale="zh" className={locale === "zh" ? "text-foreground" : ""}>
        {zhLabel}
      </Link>
      <span>/</span>
      <Link href="/" locale="en" className={locale === "en" ? "text-foreground" : ""}>
        {enLabel}
      </Link>
    </div>
  );
}

function ProductDemo({ locale }: { locale: "en" | "zh" }) {
  const copy = getDemoCopy(locale);
  const { ref, elapsedMs, restartMs, isVisible } = useDemoTimeline();
  const demoViewportRef = useRef<HTMLDivElement | null>(null);
  const bidStageRef = useRef<HTMLDivElement | null>(null);
  const bidBoardRef = useRef<HTMLDivElement | null>(null);
  const selectedBidRowRef = useRef<HTMLDivElement | null>(null);
  const chatAgentShellRef = useRef<HTMLDivElement | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const bidBoardInteractedRef = useRef(false);
  const [demoViewportSize, setDemoViewportSize] = useState({ width: 0, height: 0 });
  const [bidStageSize, setBidStageSize] = useState({ width: 920, height: 340 });
  const [selectionPortalFrame, setSelectionPortalFrame] = useState<DemoPortalFrame | null>(null);
  const chatLeadMs = 120;
  const bidsTailMs = 140;
  const categorySelectedIndex = copy.selectedCategoryIndex;
  const composeScreenActive = elapsedMs < DEMO_PHASES.bids.start;
  const bidsScreenActive =
    elapsedMs >= DEMO_PHASES.bids.start && elapsedMs < DEMO_PHASES.confirm.start + bidsTailMs;
  const chatScreenActive =
    elapsedMs >= DEMO_PHASES.confirm.start - chatLeadMs && elapsedMs < DEMO_PHASES.complete.start;
  const completeScreenActive = elapsedMs >= DEMO_PHASES.complete.start;
  const confirmOverlapStart = DEMO_PHASES.confirm.start - chatLeadMs;
  const confirmOverlapEnd = DEMO_PHASES.confirm.start + bidsTailMs;
  const screenBlendActive = elapsedMs >= confirmOverlapStart && elapsedMs <= confirmOverlapEnd;

  const isRestartHolding = restartMs > 0;
  const categoryMs = isRestartHolding
    ? 0
    : getPhaseElapsed(
        elapsedMs,
        DEMO_PHASES.category.start,
        DEMO_PHASES.category.duration,
      );
  const composeMs = isRestartHolding
    ? 0
    : getPhaseElapsed(
        elapsedMs,
        DEMO_PHASES.compose.start,
        DEMO_PHASES.compose.duration,
      );
  const bidMs = isRestartHolding
    ? 0
    : getPhaseElapsed(elapsedMs, DEMO_PHASES.bids.start, DEMO_PHASES.bids.duration);
  const selectMs = isRestartHolding
    ? 0
    : getPhaseElapsed(
        elapsedMs,
        DEMO_PHASES.select.start,
        DEMO_PHASES.select.duration,
      );
  const confirmMs = isRestartHolding
    ? 0
    : getPhaseElapsed(
        elapsedMs,
        DEMO_PHASES.confirm.start,
        DEMO_PHASES.confirm.duration,
      );
  const completeMs = getPhaseElapsed(
    elapsedMs,
    DEMO_PHASES.complete.start,
    DEMO_PHASES.complete.duration,
  );

  const categoryFlashIndex =
    categoryMs < copy.categories.length * 220
      ? Math.min(copy.categories.length - 1, Math.floor(categoryMs / 220))
      : -1;
  const categorySelected = categoryMs >= 1_320;
  const coveragePreviewStepMs = 240;
  const coveragePreviewIndex =
    categoryMs < copy.coverageQuestions.length * coveragePreviewStepMs
      ? Math.min(
          copy.coverageQuestions.length - 1,
          Math.floor(categoryMs / coveragePreviewStepMs),
        )
      : copy.selectedCoverageIndex;
  const coverageReelDimmed = composeMs > 640;
  const coverageReelLocked = categorySelected;
  const composeContextVisible = composeMs > 220;
  const promptCharacters = Array.from(copy.prompt);
  const promptTypingInterval =
    promptCharacters.length > 0
      ? clamp(
          (DEMO_PHASES.compose.duration - 1_140) / promptCharacters.length,
          44,
          82,
        )
      : 82;
  const promptCharacterCount = Math.min(
    promptCharacters.length,
    Math.floor(composeMs / promptTypingInterval),
  );
  const typedPrompt = promptCharacters.slice(0, promptCharacterCount).join("");
  const promptTypingProgress =
    promptCharacters.length > 0 ? promptCharacterCount / promptCharacters.length : 1;
  const promptTypingCompleteAt = promptCharacters.length * promptTypingInterval;
  const composeFooterVisible = composeMs > 1_180;
  const publishButtonVisible = promptTypingProgress > 0.32 && composeMs > 2_500;
  const publishButtonClickStart = Math.min(
    DEMO_PHASES.compose.duration - 720,
    Math.max(5_760, promptTypingCompleteAt + 360),
  );
  const publishButtonClicking =
    composeMs > publishButtonClickStart && composeMs < publishButtonClickStart + 360;
  const publishButtonLoading =
    composeMs >= publishButtonClickStart + 360 && composeMs < DEMO_PHASES.compose.duration;

  const bidCountdownSteps = [20, 18, 16, 14, 12, 10, 8, 6];
  const bidCountdownStepMs = DEMO_PHASES.bids.duration / bidCountdownSteps.length;
  const countdownIndex = Math.min(
    bidCountdownSteps.length - 1,
    Math.floor(bidMs / bidCountdownStepMs),
  );
  const countdownValue = bidCountdownSteps[countdownIndex];
  const bidProgress = Math.min(1, bidMs / 6_600);
  const bidListEnergized = bidMs > 1_450 && bidMs < 6_200;
  const bidListRushing = bidMs > 520 && bidMs < 2_500;
  const bidListLocked = bidMs > 2_050;
  const rankedBids = getRankedDemoBids(copy.bids, bidMs);
  const selectedBidId = rankedBids[0]?.id ?? null;
  const selectedBid = rankedBids.find((bid) => bid.id === selectedBidId) ?? rankedBids[0] ?? copy.bids[0];
  const previousRankedBids = getRankedDemoBidList(copy.bids, Math.max(0, bidMs - 1_200));
  const previousTopBidId = previousRankedBids[0]?.id ?? null;
  const currentTopBid = rankedBids[0] ?? null;
  const takeoverWindowActive = isPrimaryTakeoverWindow(bidMs);
  const takeoverActive = Boolean(
    takeoverWindowActive &&
      currentTopBid &&
      currentTopBid.id === "copywriter" &&
      previousTopBidId &&
      currentTopBid.id !== previousTopBidId &&
      currentTopBid.previousRank !== null &&
      currentTopBid.previousRank > 1,
  );
  const takeoverBidId = takeoverActive ? currentTopBid?.id ?? null : null;
  const displacedTopBidId = takeoverActive ? previousTopBidId : null;
  const bidViewportWidth =
    demoViewportSize.width > 0 ? Math.max(280, demoViewportSize.width - 28) : 920;
  const bidStageMode =
    bidViewportWidth < 560 ? "compact" : bidViewportWidth < 760 ? "medium" : "wide";
  const compactBidCards = bidStageMode === "compact";
  const boardRowGap = bidStageMode === "compact" ? 12 : 14;
  const boardTargetHeight = Math.max(320, Math.round(bidStageSize.height));
  const boardVisibleSlots =
    bidStageMode === "compact" ? 2.8 : bidStageMode === "medium" ? 2.95 : 3.05;
  const boardRowHeight = Math.max(
    bidStageMode === "compact" ? 228 : bidStageMode === "medium" ? 212 : 198,
    Math.round((boardTargetHeight - 28 - boardRowGap * 3) / boardVisibleSlots),
  );
  const boardContentHeight =
    rankedBids.length * boardRowHeight +
    Math.max(0, rankedBids.length - 1) * boardRowGap;
  const boardHeight = Math.max(boardTargetHeight, boardContentHeight + 36);
  const boardTopOffset =
    boardContentHeight < boardTargetHeight
      ? Math.max(18, Math.round((boardTargetHeight - boardContentHeight) / 2))
      : 18;
  const boardScrollable = boardHeight > boardTargetHeight + 8;
  const hiddenBidCount = Math.max(0, rankedBids.length - 3);
  const queuedBids = hiddenBidCount > 0 ? rankedBids.slice(3, 6) : [];
  const boardCardWidth =
    bidStageMode === "compact"
      ? Math.max(268, bidViewportWidth - 28)
      : bidStageMode === "medium"
        ? Math.min(Math.max(320, bidViewportWidth - 40), 620)
        : Math.min(Math.max(420, bidViewportWidth - 72), 760);
  const enteringBid =
    [...copy.bids]
      .reverse()
      .find((bid) => bidMs >= bid.joinedAtMs - 180 && bidMs < bid.joinedAtMs + 380) ?? null;
  const rerankBannerVisible = takeoverActive || bidMs > 4_600;
  const selectedButtonClicking = selectMs > 1_980 && selectMs < 2_460;
  const dimOtherCards = selectMs > 760;
  const selectionFocusLocked = selectMs > 1_000 && confirmMs < 420;
  const selectionPortalVisible = selectMs > 1_040 && confirmMs < 820;
  const selectionPortalDetached = selectMs > 1_160;
  const selectionPortalFloating = selectMs > 2_140 && confirmMs < 220;
  const selectionPortalDocking = confirmMs >= 220;
  const selectionPortalSettled = confirmMs > 360;
  const selectionPortalFading = confirmMs > 420;
  const portalSelectMeasureTick = Math.floor(selectMs / 80);
  const portalConfirmMeasureTick = Math.floor(confirmMs / 80);
  const roomMs =
    elapsedMs < DEMO_PHASES.confirm.start
      ? 0
      : Math.min(
          elapsedMs - DEMO_PHASES.confirm.start,
          DEMO_PHASES.complete.start - DEMO_PHASES.confirm.start,
        );
  const chatShellPrimed = roomMs > 0;
  const chatShellSettled = roomMs > 140;
  const chatHeaderReveal = easeOutCubic(clamp01((roomMs - 80) / 180));
  const handoffInlineVisible = roomMs > 80 && roomMs < 820;
  const confirmIntroVisible = roomMs > 260;
  const confirmUserVisible = roomMs > 1_220;
  const confirmFindingsVisible = roomMs > 2_320;
  const confirmDecisionVisible = roomMs > 3_280 && roomMs < 5_680;
  const streamedFindingCharacters = Array.from(copy.findings);
  const streamedFindingInterval =
    streamedFindingCharacters.length > 0
      ? clamp(2_260 / streamedFindingCharacters.length, 18, 34)
      : 34;
  const streamedFindingCount = Math.min(
    streamedFindingCharacters.length,
    Math.max(0, Math.floor((roomMs - 2_280) / streamedFindingInterval)),
  );
  const streamedFindings = streamedFindingCharacters.slice(0, streamedFindingCount).join("");
  const findingsTypingCompleteAt = 2_280 + streamedFindingCharacters.length * streamedFindingInterval;
  const confirmPrimaryClicking = roomMs > 4_340 && roomMs < 4_700;
  const formalStageStarted = roomMs > 5_020;
  const activeGhostUserRevealAt = Math.max(5_360, findingsTypingCompleteAt + 420);
  const activeGhostAgentRevealAt = Math.max(6_120, activeGhostUserRevealAt + 760);
  const artifactOneRevealAt = Math.max(6_880, activeGhostAgentRevealAt + 760);
  const activeThanksRevealAt = Math.max(8_160, artifactOneRevealAt + 1_280);
  const artifactTwoRevealAt = Math.max(9_280, activeThanksRevealAt + 900);
  const artifactThreeRevealAt = Math.max(10_980, artifactTwoRevealAt + 1_120);
  const finishTaskRevealAt = Math.max(11_760, artifactThreeRevealAt + 780);
  const activeGhostUserVisible = roomMs > activeGhostUserRevealAt;
  const activeGhostAgentVisible = roomMs > activeGhostAgentRevealAt;
  const artifactOneVisible = roomMs > artifactOneRevealAt;
  const activeThanksVisible = roomMs > activeThanksRevealAt;
  const artifactTwoVisible = roomMs > artifactTwoRevealAt;
  const artifactThreeVisible = roomMs > artifactThreeRevealAt;
  const finishTaskVisible = roomMs > finishTaskRevealAt && roomMs < finishTaskRevealAt + 1_420;
  const finishTaskClicking = roomMs > finishTaskRevealAt + 600 && roomMs < finishTaskRevealAt + 1_000;
  const completeOpacity = 1;
  const commentVisible = completeMs > 3_400;
  const tipVisible = completeMs > 5_100;
  const tipFocused = completeMs > 5_360;
  const tipTypingCount = Math.max(0, Math.min(4, Math.floor((completeMs - 5_760) / 170) + 1));
  const tipTypedValue = ["2", "2.", "2.0", "2.00"][Math.max(0, tipTypingCount - 1)] ?? "";
  const tipConfirmVisible = completeMs > 6_520;
  const tipConfirmClicking = completeMs > 6_920 && completeMs < 7_280;
  const tipConfirmCommitted = completeMs >= 6_920;
  const tipDoneVisible = completeMs > 7_360;
  const deliveryLive = formalStageStarted;
  const liveTotalAmount =
    roomMs < 5_020 ? "$0.00" : roomMs < 9_980 ? "$0.10" : "$0.20";
  const liveRoundValue =
    roomMs < 1_000
      ? "1 / 5"
      : roomMs < 2_000
        ? "2 / 5"
        : roomMs < 3_280
          ? "3 / 5"
          : roomMs < 9_320
            ? "4 / 5"
            : "5 / 5";
  const [artifactOne, artifactTwo, artifactThree] = copy.deliveryArtifacts;
  const selectedAgentMeta = [selectedBid.bestForSummary, selectedBid.responseTime, selectedBid.unitPrice]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    const node = demoViewportRef.current;

    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      setDemoViewportSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      });
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = bidStageRef.current;

    if (!node) {
      return;
    }

    const updateSize = (width: number, height: number) => {
      setBidStageSize({
        width: Math.max(280, Math.round(width)),
        height: Math.max(320, Math.round(height)),
      });
    };

    const rect = node.getBoundingClientRect();
    updateSize(rect.width, rect.height);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      updateSize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = bidBoardRef.current;

    if (!node) {
      return;
    }

    if (bidMs < 120) {
      bidBoardInteractedRef.current = false;
      node.scrollTop = 0;
      return;
    }

    if (bidBoardInteractedRef.current) {
      return;
    }

    const maxScroll = Math.max(0, node.scrollHeight - node.clientHeight);

    if (maxScroll <= 0) {
      node.scrollTop = 0;
      return;
    }

    node.scrollTop = 0;
  }, [bidMs, boardHeight]);

  useEffect(() => {
    const node = chatMessagesRef.current;

    if (!node || !chatScreenActive) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
    });

    return () => cancelAnimationFrame(frameId);
  }, [
    chatScreenActive,
    roomMs,
    confirmIntroVisible,
    confirmUserVisible,
    confirmFindingsVisible,
    streamedFindingCount,
    handoffInlineVisible,
    confirmDecisionVisible,
    formalStageStarted,
    artifactOneVisible,
    artifactTwoVisible,
    artifactThreeVisible,
    activeGhostUserVisible,
    activeGhostAgentVisible,
    activeThanksVisible,
    finishTaskVisible,
  ]);

  useLayoutEffect(() => {
    if (!selectionPortalVisible) {
      setSelectionPortalFrame((previous) => (previous === null ? previous : null));
      return;
    }

    const viewportNode = demoViewportRef.current;
    const sourceNode = selectedBidRowRef.current;
    const targetNode = chatAgentShellRef.current;

    if (!viewportNode || !sourceNode || !targetNode) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      const viewportRect = viewportNode.getBoundingClientRect();
      const sourceRect = sourceNode.getBoundingClientRect();
      const targetRect = targetNode.getBoundingClientRect();
      const sourceInsetX = compactBidCards ? 12 : 16;
      const sourceInsetTop = compactBidCards ? 10 : 12;
      const targetWidth = Math.max(240, targetRect.width);
      const centerWidth = Math.max(
        targetWidth + (compactBidCards ? 22 : 34),
        Math.min(
          Math.max(compactBidCards ? 300 : 420, viewportRect.width - (compactBidCards ? 44 : 88)),
          compactBidCards ? 360 : 520,
        ),
      );
      const centerHeight = compactBidCards ? 132 : 144;
      const sourceTop = sourceRect.top - viewportRect.top + sourceInsetTop;
      const centerTop = Math.max(
        88,
        Math.min(
          Math.round(sourceTop - 30),
          Math.round(viewportRect.height * (compactBidCards ? 0.29 : 0.25)),
        ),
      );
      const nextFrame = {
        sourceLeft: Math.max(12, sourceRect.left - viewportRect.left + sourceInsetX),
        sourceTop: Math.max(12, sourceTop),
        sourceWidth: Math.max(240, sourceRect.width - sourceInsetX * 2),
        sourceHeight: Math.max(
          76,
          Math.min(sourceRect.height - sourceInsetTop * 2, compactBidCards ? 96 : 104),
        ),
        centerLeft: Math.round((viewportRect.width - centerWidth) / 2),
        centerTop,
        centerWidth,
        centerHeight,
        targetLeft: Math.max(12, targetRect.left - viewportRect.left),
        targetTop: Math.max(12, targetRect.top - viewportRect.top),
        targetWidth,
        targetHeight: Math.max(72, targetRect.height),
      };

      setSelectionPortalFrame((previous) =>
        portalFramesEqual(previous, nextFrame) ? previous : nextFrame,
      );
    });

    return () => cancelAnimationFrame(frameId);
  }, [
    selectionPortalVisible,
    compactBidCards,
    selectedBid.id,
    demoViewportSize.width,
    demoViewportSize.height,
    bidStageSize.width,
    bidStageSize.height,
    portalSelectMeasureTick,
    portalConfirmMeasureTick,
  ]);

  function markBidBoardInteracted() {
    bidBoardInteractedRef.current = true;
  }

  const selectionPortalStyle = selectionPortalFrame
    ? ({
        "--portal-source-left": `${selectionPortalFrame.sourceLeft}px`,
        "--portal-source-top": `${selectionPortalFrame.sourceTop}px`,
        "--portal-source-width": `${selectionPortalFrame.sourceWidth}px`,
        "--portal-source-height": `${selectionPortalFrame.sourceHeight}px`,
        "--portal-center-left": `${selectionPortalFrame.centerLeft}px`,
        "--portal-center-top": `${selectionPortalFrame.centerTop}px`,
        "--portal-center-width": `${selectionPortalFrame.centerWidth}px`,
        "--portal-center-height": `${selectionPortalFrame.centerHeight}px`,
        "--portal-target-left": `${selectionPortalFrame.targetLeft}px`,
        "--portal-target-top": `${selectionPortalFrame.targetTop}px`,
        "--portal-target-width": `${selectionPortalFrame.targetWidth}px`,
        "--portal-target-height": `${selectionPortalFrame.targetHeight}px`,
      } as React.CSSProperties)
    : undefined;

  return (
    <div ref={ref} className={`landing-demo card-shadow${isVisible ? "" : " is-paused"}`}>
      <div className="landing-demo-badge">{copy.badge}</div>
      <div className="landing-demo-chrome" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div ref={demoViewportRef} className="landing-demo-viewport">
        <div
          className={`landing-demo-screen landing-demo-compose-screen${composeScreenActive ? " is-active" : ""}`}
        >
          <div className="landing-demo-chip-row">
            {copy.categories.map((category, index) => {
              const isSelected = index === categorySelectedIndex && categorySelected;
              const isFlashing = categoryFlashIndex === index && !isSelected;

              return (
                <div
                  key={category}
                  className={`landing-demo-chip${isSelected ? " is-selected" : ""}${isFlashing ? " is-flashing" : ""}`}
                >
                  {category}
                </div>
              );
            })}
          </div>

          <div className={`landing-demo-coverage-reel${coverageReelLocked ? " is-locked" : ""}${coverageReelDimmed ? " is-dimmed" : ""}`}>
            <div className="landing-demo-coverage-title-row">
              <div className="landing-demo-coverage-title">{copy.coverageTitle}</div>
              <div className="landing-demo-coverage-count">{copy.coverageCountLabel}</div>
            </div>
            <div className="landing-demo-coverage-stack">
              <div className={`landing-demo-coverage-card is-active${categorySelected ? " is-locked" : ""}`}>
                {copy.coverageQuestions[coveragePreviewIndex]}
              </div>
            </div>
            <div className="landing-demo-coverage-dots" aria-hidden="true">
              {copy.coverageQuestions.map((item, index) => (
                <span
                  key={item}
                  className={`landing-demo-coverage-dot${index === coveragePreviewIndex ? " is-active" : ""}${index === copy.selectedCoverageIndex && categorySelected ? " is-locked" : ""}`}
                />
              ))}
            </div>
          </div>

          <div className={`landing-demo-compose-panel${composeMs > 120 ? " is-visible" : ""}`}>
            <div className="landing-demo-input-shell">
              <div className={`landing-demo-compose-context${composeContextVisible ? " is-visible" : ""}`}>
                <span className="landing-demo-compose-context-label">{copy.inputLabel}</span>
                <span className="landing-demo-compose-context-meta">{copy.inputMeta}</span>
              </div>

              <div className="landing-demo-input-frame">
                <div className="landing-demo-input-text">
                  {typedPrompt}
                  <span className="landing-demo-caret" aria-hidden="true" />
                </div>
              </div>

              <div className={`landing-demo-publish-row${composeFooterVisible ? " is-visible" : ""}`}>
                <div className="landing-demo-input-assist">{copy.inputAssist}</div>
                <div
                  className={`landing-demo-publish-button${publishButtonVisible ? " is-visible" : ""}${publishButtonClicking ? " is-clicking" : ""}${publishButtonLoading ? " is-loading" : ""}`}
                >
                  {publishButtonLoading ? (
                    <span className="landing-demo-spinner" aria-hidden="true" />
                  ) : (
                    copy.publish
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`landing-demo-screen landing-demo-bids-screen${bidsScreenActive ? " is-active" : ""}${selectionFocusLocked ? " is-focus-locked" : ""}${screenBlendActive ? " is-handoff-out" : ""}`}
        >
          <div className="landing-demo-bids-ambient" aria-hidden="true" />
          <div className="landing-demo-bids-header">
            <p className="landing-demo-bids-label">{copy.bidding}</p>
            <div className="landing-demo-bids-countdown">{countdownValue}</div>
          </div>
          <div className="landing-demo-bids-meta">
            <div className="landing-demo-bids-meta-pill">{copy.matchedLabel}</div>
            <div
              className={`landing-demo-bids-meta-pill landing-demo-bids-meta-pill-accent${takeoverActive ? " is-live" : rerankBannerVisible ? " is-armed" : ""}`}
            >
              {takeoverActive ? copy.rerankingLabel : copy.sortingLabel}
            </div>
            <div className="landing-demo-bids-meta-pill landing-demo-bids-meta-pill-ghost">
              {copy.moreLabel}
            </div>
          </div>
          <div className="landing-demo-bids-toolbar">
            <div className="landing-demo-bids-toolbar-spacer" />
            <div className="landing-demo-bids-withdraw">{copy.withdraw}</div>
          </div>
          <div className="landing-demo-progress-bar" aria-hidden="true">
            <div
              className="landing-demo-progress-fill"
              style={{ transform: `scaleX(${bidProgress})` }}
            />
          </div>

          <div
            ref={bidStageRef}
            className="landing-demo-bid-stage"
            style={{ width: `${bidViewportWidth}px` }}
          >
            <div
              className={`landing-demo-bid-scroll-shell${boardScrollable ? " is-scrollable" : ""}`}
              style={{ height: `${boardTargetHeight}px` }}
            >
              <div
                ref={bidBoardRef}
                className="landing-demo-bid-scroll"
                onWheel={markBidBoardInteracted}
                onTouchStart={markBidBoardInteracted}
                onPointerDown={markBidBoardInteracted}
                tabIndex={0}
              >
                <div
                  className={`landing-demo-auction-board${bidProgress >= 0.96 ? " is-settled" : ""}${bidListEnergized ? " is-energized" : ""}${bidListRushing ? " is-rushing" : ""}${bidListLocked ? " is-locked" : ""}`}
                  style={{ height: `${boardHeight}px` }}
                >
                  {takeoverActive ? (
                    <div className="landing-demo-auction-rerank-flash" aria-hidden="true" />
                  ) : null}

                  {enteringBid ? (
                    <div key={enteringBid.id} className="landing-demo-auction-signal">
                      <div className="landing-demo-bid-avatar landing-demo-auction-signal-avatar">
                        {enteringBid.avatar}
                      </div>
                      <div className="landing-demo-auction-signal-copy">
                        <span>{copy.entryLabel}</span>
                        <strong>{enteringBid.name}</strong>
                      </div>
                    </div>
                  ) : null}

                  {rankedBids.map((bid, slotIndex) => {
                    const isSelected = bid.id === selectedBidId && selectMs > 220;
                    const isDimmed = bid.id !== selectedBidId && dimOtherCards;
                    const isButtonClicking = bid.id === selectedBidId && selectedButtonClicking;
                    const isTopRank = slotIndex === 0;
                    const isEntering = bidMs < bid.joinedAtMs + 520;
                    const isTakingOver = bid.id === takeoverBidId;
                    const isDisplaced = bid.id === displacedTopBidId;
                    const isHandoffSource = bid.id === selectedBidId && selectionPortalDetached;
                    const isPromoted =
                      isTakingOver ||
                      bid.rankingState === "up" ||
                      (bid.rankingState === "new" && bid.joinedAtMs > 900);
                    const stateLabel =
                      isTakingOver
                        ? copy.takeoverLabel
                        : bid.rankingState === "up"
                        ? copy.rerankedLabel
                        : bid.rankingState === "new"
                          ? copy.joinedLabel
                          : null;

                    return (
                      <div
                        key={bid.id}
                        ref={bid.id === selectedBidId ? selectedBidRowRef : null}
                        className={`landing-demo-auction-row landing-demo-auction-row-${slotIndex} is-visible${compactBidCards ? " is-compact" : ""}${isSelected ? " is-selected" : ""}${isDimmed ? " is-dimmed" : ""}${isTopRank ? " is-top-rank" : ""}${isPromoted ? " is-promoted" : ""}${isEntering ? " is-entering" : ""}${isTakingOver ? " is-taking-over" : ""}${isDisplaced ? " is-displaced" : ""}${isHandoffSource ? " is-handoff-source" : ""}`}
                        style={
                          {
                            "--auction-row-top": `${boardTopOffset + slotIndex * (boardRowHeight + boardRowGap)}px`,
                            "--auction-row-width": `${boardCardWidth}px`,
                            "--auction-row-height": `${boardRowHeight}px`,
                          } as React.CSSProperties
                        }
                      >
                        <div className="landing-demo-auction-card-top">
                          <div className="landing-demo-auction-card-identity">
                            <div className="landing-demo-auction-rank">{bid.rank}</div>
                            <div className="landing-demo-bid-avatar">{bid.avatar}</div>
                            <div className="landing-demo-bid-name-group">
                              <div className="landing-demo-bid-name-row">
                                <div className="landing-demo-bid-name">{bid.name}</div>
                                {bid.fitBadge ? (
                                  <div className="landing-demo-bid-fit-badge">{bid.fitBadge}</div>
                                ) : null}
                                {stateLabel ? (
                                  <div
                                    className={`landing-demo-bid-state-badge${isTakingOver || bid.rankingState === "up" ? " is-up" : " is-new"}`}
                                  >
                                    {stateLabel}
                                  </div>
                                ) : null}
                              </div>
                              <div className="landing-demo-auction-meta-line">
                                {bid.handle ? <span>{bid.handle}</span> : null}
                                <span>{bid.roundRange}</span>
                                <span>{bid.totalRange}</span>
                              </div>
                            </div>
                          </div>
                          <div className="landing-demo-auction-card-stats">
                            <div className="landing-demo-auction-score-pill">
                              <span>{copy.scoreLabel}</span>
                              <strong>{bid.liveScore}</strong>
                            </div>
                            <div className="landing-demo-auction-rating-line">
                              <span>⭐ {bid.rating}</span>
                              <span className="landing-demo-auction-metric-separator">·</span>
                              <span>{bid.completion}</span>
                            </div>
                          </div>
                        </div>

                        <div className="landing-demo-auction-appeal">
                          <span className="landing-demo-auction-appeal-prefix">
                            {locale === "zh" ? "我来做：" : "I can take this:"}
                          </span>
                          <span className="landing-demo-auction-appeal-text">{bid.appeal}</span>
                        </div>
                        <div className="landing-demo-auction-card-footer">
                          <div className="landing-demo-auction-response">
                            <span>{bid.bestForSummary}</span>
                            <span>{bid.responseTime}</span>
                            <span>{bid.unitPrice}</span>
                          </div>
                          <div
                            className={`landing-demo-bid-action${isSelected ? " is-selected" : ""}${isButtonClicking ? " is-clicking" : ""}`}
                          >
                            {copy.select}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {hiddenBidCount > 0 ? (
                <div className="landing-demo-bid-queue-chip">
                  <div className="landing-demo-bid-queue-avatars" aria-hidden="true">
                    {queuedBids.map((bid) => (
                      <span key={bid.id} className="landing-demo-bid-queue-avatar">
                        {bid.avatar}
                      </span>
                    ))}
                  </div>
                  <span className="landing-demo-bid-queue-text">
                    +{hiddenBidCount} {copy.queueLabel}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {selectionPortalVisible && selectionPortalStyle ? (
          <div
            className={`landing-demo-selection-portal${selectionPortalDetached ? " is-detached" : ""}${selectionPortalFloating ? " is-floating" : ""}${selectionPortalDocking ? " is-docking" : ""}${selectionPortalSettled ? " is-settled" : ""}${selectionPortalFading ? " is-fading" : ""}`}
            style={selectionPortalStyle}
          >
            <div className="landing-demo-selection-portal-core">
              <div className="landing-demo-selection-portal-main">
                <div className="landing-demo-selection-portal-left">
                  <div className="landing-demo-bid-avatar landing-demo-selection-portal-avatar">
                    {selectedBid.avatar}
                  </div>
                  <div className="landing-demo-selection-portal-copy">
                    <div className="landing-demo-selection-portal-title-row">
                      <div className="landing-demo-selection-portal-title">{selectedBid.name}</div>
                      {selectedBid.fitBadge ? (
                        <div className="landing-demo-selection-portal-fit">
                          {selectedBid.fitBadge}
                        </div>
                      ) : null}
                    </div>
                    <div className="landing-demo-selection-portal-subtitle">{selectedAgentMeta}</div>
                  </div>
                </div>
                <div className="landing-demo-selection-portal-right">
                  <div className="landing-demo-selection-portal-score">
                    <span>{copy.scoreLabel}</span>
                    <strong>{selectedBid.liveScore}</strong>
                  </div>
                </div>
              </div>
              <div className="landing-demo-selection-portal-status">
                <div className="landing-demo-selection-portal-status-copy">
                  <span className="landing-demo-selection-portal-status-label">
                    {copy.handoffLabel}
                  </span>
                  <span className="landing-demo-selection-portal-status-hint">
                    {copy.handoffHint}
                  </span>
                </div>
                <div className="landing-demo-selection-portal-meter" aria-hidden="true">
                  <span className="is-active" />
                  <span className={confirmMs > 320 || selectionPortalDocking ? " is-active" : ""} />
                  <span className={confirmMs > 560 || selectionPortalDocking ? " is-active" : ""} />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div
          className={`landing-demo-screen landing-demo-chat-screen${chatScreenActive ? " is-active" : ""}${screenBlendActive ? " is-handoff-in" : ""}`}
        >
          <div className={`landing-demo-chat-shell${chatShellPrimed ? " is-primed" : ""}${chatShellSettled ? " is-settled" : ""}`}>
            <div className="landing-demo-chat-header">
              <div className="landing-demo-chat-topbar">
                <div className="landing-demo-chat-header-main">
                  <div
                    ref={chatAgentShellRef}
                    className={`landing-demo-chat-agent-shell${chatHeaderReveal > 0 ? " is-revealed" : ""}`}
                    style={{ opacity: chatHeaderReveal }}
                  >
                    <div className="landing-demo-chat-agent-identity">
                      <div className="landing-demo-bid-avatar landing-demo-chat-agent-avatar">
                        {selectedBid.avatar}
                      </div>
                      <div className="landing-demo-chat-agent-copy">
                        <div className="landing-demo-chat-agent-title-row">
                          <div className="landing-demo-chat-agent-title">{selectedBid.name}</div>
                          {selectedBid.fitBadge ? (
                            <div className="landing-demo-chat-agent-fit">{selectedBid.fitBadge}</div>
                          ) : null}
                        </div>
                        <div className="landing-demo-chat-agent-meta">{selectedAgentMeta}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="landing-demo-chat-status-stack">
                  <div
                    className={`landing-demo-chat-badge${deliveryLive ? " is-active" : " is-confirm"}`}
                  >
                    {deliveryLive ? copy.activeBadge : copy.confirmBadge}
                  </div>
                </div>
              </div>

              <div
                className={`landing-demo-chat-metrics${chatHeaderReveal > 0 ? " is-revealed" : ""}`}
                style={{ opacity: chatHeaderReveal }}
              >
                <div className="landing-demo-chat-metric-chip landing-demo-chat-metric-chip-accent">
                  <span>{copy.scoreLabel}</span>
                  <strong>{selectedBid.liveScore}</strong>
                </div>
                <div className="landing-demo-chat-live-total">
                  <span>{copy.liveTotalLabel}</span>
                  <strong>{liveTotalAmount}</strong>
                </div>
                <div className="landing-demo-chat-live-round">
                  <span>{copy.liveRoundLabel}</span>
                  <strong>{liveRoundValue}</strong>
                </div>
              </div>
            </div>

            <div className="landing-demo-chat-body">
              <div ref={chatMessagesRef} className="landing-demo-chat-messages">
                {handoffInlineVisible ? (
                  <div className="landing-demo-handoff-inline is-visible">
                    <span className="landing-demo-handoff-inline-dot" aria-hidden="true" />
                    <span>{copy.handoffInlineLabel}</span>
                  </div>
                ) : null}

                {confirmIntroVisible ? (
                  <div className="landing-demo-message landing-demo-message-agent is-visible">
                    {copy.openingAgentMessage}
                  </div>
                ) : null}
                {confirmUserVisible ? (
                  <div className="landing-demo-message landing-demo-message-user is-visible">
                    {copy.openingUserMessage}
                  </div>
                ) : null}
                {confirmFindingsVisible ? (
                  <div className="landing-demo-message landing-demo-message-agent landing-demo-message-stream is-visible">
                    {streamedFindings}
                    {streamedFindingCount < streamedFindingCharacters.length ? (
                      <span className="landing-demo-caret" aria-hidden="true" />
                    ) : null}
                  </div>
                ) : null}
                {activeGhostUserVisible ? (
                  <div className="landing-demo-message landing-demo-message-user is-visible">
                    {copy.activeGhostUser}
                  </div>
                ) : null}
                {activeGhostAgentVisible ? (
                  <div className="landing-demo-message landing-demo-message-agent is-visible">
                    {copy.activeGhostAgent}
                  </div>
                ) : null}
                {artifactOneVisible ? (
                  <div className="landing-demo-delivery-snippet is-visible">
                    <div className="landing-demo-delivery-snippet-top">
                      <span className="landing-demo-delivery-snippet-label">{artifactOne.label}</span>
                      <span className="landing-demo-delivery-snippet-status">{artifactOne.status}</span>
                    </div>
                    <div className="landing-demo-delivery-snippet-title">{artifactOne.title}</div>
                    {artifactOne.lines.map((line) => (
                      <div key={line} className="landing-demo-delivery-snippet-line">
                        {line}
                      </div>
                    ))}
                  </div>
                ) : null}
                {activeThanksVisible ? (
                  <div className="landing-demo-message landing-demo-message-user is-visible">
                    {copy.thanks}
                  </div>
                ) : null}
                {artifactTwoVisible ? (
                  <div className="landing-demo-delivery-snippet is-visible">
                    <div className="landing-demo-delivery-snippet-top">
                      <span className="landing-demo-delivery-snippet-label">{artifactTwo.label}</span>
                      <span className="landing-demo-delivery-snippet-status">{artifactTwo.status}</span>
                    </div>
                    <div className="landing-demo-delivery-snippet-title">{artifactTwo.title}</div>
                    {artifactTwo.lines.map((line) => (
                      <div key={line} className="landing-demo-delivery-snippet-line">
                        {line}
                      </div>
                    ))}
                  </div>
                ) : null}
                {artifactThreeVisible ? (
                  <div className="landing-demo-delivery-snippet is-visible">
                    <div className="landing-demo-delivery-snippet-top">
                      <span className="landing-demo-delivery-snippet-label">{artifactThree.label}</span>
                      <span className="landing-demo-delivery-snippet-status">{artifactThree.status}</span>
                    </div>
                    <div className="landing-demo-delivery-snippet-title">{artifactThree.title}</div>
                    {artifactThree.lines.map((line) => (
                      <div key={line} className="landing-demo-delivery-snippet-line">
                        {line}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="landing-demo-chat-footer">
              <div className="landing-demo-rounds">
                {copy.rounds.map((round, index) => {
                  const roundThresholds = [320, 1_020, 1_860, 4_720, 7_120];
                  const isActive = roomMs > (roundThresholds[index] ?? 1_720 + index * 760);
                  return (
                    <div
                      key={round}
                      className={`landing-demo-round${isActive ? " is-active" : ""}`}
                    >
                      <span className="landing-demo-round-dot">●</span>
                      {round}
                    </div>
                  );
                })}
              </div>

              <div className="landing-demo-chat-composer">
                <div className="landing-demo-chat-composer-input">{copy.composerPlaceholder}</div>
                <div className="landing-demo-chat-composer-action">{copy.composerAction}</div>
              </div>

              {confirmDecisionVisible ? (
                <div className="landing-demo-confirm-card is-visible">
                  <div
                    className={`landing-demo-confirm-primary${confirmPrimaryClicking ? " is-clicking" : ""}`}
                  >
                    {copy.confirmContinue}
                  </div>
                  <div className="landing-demo-confirm-secondary">{copy.endTask}</div>
                </div>
              ) : null}

              {finishTaskVisible ? (
                <div className="landing-demo-end-row is-visible">
                  <div
                    className={`landing-demo-confirm-secondary landing-demo-formal-end${finishTaskClicking ? " is-clicking" : ""}`}
                  >
                    {locale === "zh" ? "结束任务，进入评价" : "Finish Task and Review"}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={`landing-demo-screen landing-demo-complete-screen${completeScreenActive ? " is-active" : ""}`}
        >
          <div className="landing-demo-complete-card" style={{ opacity: completeOpacity }}>
            <div className="landing-demo-complete-eyebrow">{copy.completeEyebrow}</div>
            <div className="landing-demo-complete-title">{copy.completeTitle}</div>

            <div className="landing-demo-stars" aria-label="5 stars">
              {Array.from({ length: 5 }).map((_, index) => (
                <span
                  key={index}
                  className={`landing-demo-star${completeMs > 250 + index * 150 ? " is-active" : ""}`}
                >
                  ★
                </span>
              ))}
            </div>

            <div className="landing-demo-complete-row">
              <span>{copy.completionConfirmLabel}</span>
              <span>{copy.completionConfirmRounds}</span>
              <span>{copy.completionConfirmPrice}</span>
            </div>
            <div className="landing-demo-complete-row">
              <span>{copy.completionFormalLabel}</span>
              <span>{copy.completionFormalRounds}</span>
              <span>{copy.completionFormalPrice}</span>
            </div>
            <div className="landing-demo-complete-divider" aria-hidden="true" />
            <div className="landing-demo-complete-total">
              <span>{copy.completionTotalLabel}</span>
              <span>{copy.completionTotalPrice}</span>
            </div>

            <div className="landing-demo-delivered-block">
              <div className="landing-demo-delivered-header">
                <div className="landing-demo-delivered-title">{copy.deliveredTitle}</div>
                <div className="landing-demo-delivered-meta">{copy.deliveredMeta}</div>
              </div>
              <div className="landing-demo-delivered-list">
                {copy.deliveredPacks.map((pack) => (
                  <div key={pack.tag} className="landing-demo-delivered-pack">
                    <div className="landing-demo-delivered-pack-top">
                      <span className="landing-demo-delivered-pack-tag">{pack.tag}</span>
                      <span className="landing-demo-delivered-pack-title">{pack.title}</span>
                    </div>
                    <div className="landing-demo-delivered-pack-summary">{pack.summary}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`landing-demo-comment-block${commentVisible ? " is-visible" : ""}`}>
              <div className="landing-demo-comment-header">
                <span>{copy.commentLabel}</span>
                <span>{copy.commentHint}</span>
              </div>
              <div className="landing-demo-comment-box">{copy.commentValue}</div>
            </div>

            <div className={`landing-demo-tip-row${tipVisible ? " is-visible" : ""}${tipFocused ? " is-focused" : ""}${tipDoneVisible ? " is-done" : ""}`}>
              <span className="landing-demo-tip-label">{tipDoneVisible ? copy.tipDone : copy.tipLabel}</span>
              <div className="landing-demo-tip-controls">
                <div className={`landing-demo-tip-input${tipFocused ? " is-focused" : ""}${tipDoneVisible ? " is-settled" : ""}`}>
                  <span className="landing-demo-tip-input-symbol" aria-hidden="true">$</span>
                  <span className="landing-demo-tip-typed">
                    {tipTypingCount > 0 ? tipTypedValue : ""}
                  </span>
                  {tipFocused && tipTypingCount < 4 ? (
                    <span className="landing-demo-caret" aria-hidden="true" />
                  ) : null}
                </div>
                <div
                  className={`landing-demo-tip-confirm${tipConfirmVisible ? " is-visible" : ""}${tipConfirmCommitted ? " is-committing" : ""}${tipConfirmClicking ? " is-clicking" : ""}`}
                >
                  {copy.tipConfirm}
                </div>
                <div className={`landing-demo-tip-done${tipDoneVisible ? " is-visible" : ""}`}>
                  <span className="landing-demo-tip-done-check" aria-hidden="true">✓</span>
                  <span>+{copy.tipAmount}</span>
                </div>
              </div>
            </div>

            <div className="landing-demo-complete-actions">
              <div className="landing-demo-complete-primary">{copy.viewReport}</div>
              <div className="landing-demo-complete-secondary">{copy.publishNew}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ locale }: LandingPageProps) {
  const copy = getCopy(locale);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="landing-nav sticky top-0 z-50">
        <div className="landing-container flex items-center justify-between py-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-foreground" />
            <span className="landing-nav-text text-foreground">{copy.navLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="landing-beta-tag hidden text-[#838391] sm:block">{copy.beta}</span>
            <LanguageToggle
              locale={locale}
              zhLabel={copy.languageZh}
              enLabel={copy.languageEn}
            />
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-container relative z-10 text-center">
          <div className="landing-hero-glow" />
          <LandingReveal className="landing-hero-copy">
            <div className="landing-beta-pill inline-block rounded-full bg-[rgba(139,92,246,0.08)] text-[#8B5CF6]">
              {copy.beta}
            </div>
            <h1 className="landing-hero-title text-balance lg:whitespace-nowrap">
              <span className="text-[#18181B] dark:text-[#F4F4F5]">{copy.heroPrimary}</span>
              <span className="bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] bg-clip-text text-transparent">
                {copy.heroAccent}
              </span>
            </h1>
            <p className="landing-subtitle landing-hero-subtitle text-pretty text-[#666671] dark:text-[#8C8C99]">
              {copy.heroSubtitle}
            </p>
            <div className="landing-hero-cta-stack">
              <Link href="/early-access?source=landing-hero" locale={locale}>
                <Button
                  size="lg"
                  className="landing-primary-button min-w-[220px] bg-[#8B5CF6] text-white transition-all duration-200 hover:bg-[#7C3AED]"
                >
                  {copy.apply}
                </Button>
              </Link>
              <Link href="/login" locale={locale} className="landing-invite-entry">
                <span>{locale === "zh" ? "已获邀请" : "Invited"}</span>
                <span className="landing-invite-entry-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          </LandingReveal>
        </div>
        <a
          href="#landing-demo"
          className="landing-scroll-cue"
          aria-label={copy.scrollHint}
        >
          <span className="landing-scroll-cue-icon" aria-hidden="true">
            <ChevronDown className="h-4 w-4" />
          </span>
          <span className="landing-scroll-cue-text">{copy.scrollHint}</span>
        </a>
      </section>

      <main className="landing-main">
        <section className="landing-page-section landing-demand-section">
          <LandingReveal className="landing-container landing-section-block text-center">
            <h2 className="landing-section-title text-balance lg:whitespace-nowrap">
              <span className="text-[#18181B] dark:text-[#F4F4F5]">{copy.demandPrimary}</span>
              <span className="text-[#8B5CF6]">{copy.demandAccent}</span>
            </h2>
            <p className="landing-subtitle landing-section-subtitle text-[#666671] dark:text-[#8C8C99]">
              {copy.demandSubtitle}
            </p>
          </LandingReveal>
        </section>

        <section id="landing-demo" className="landing-page-section landing-demo-section">
          <div className="landing-container">
            <div className="landing-demo-shell">
              <LandingReveal className="landing-demo-heading text-center">
                <h2 className="landing-section-title text-balance lg:whitespace-nowrap">
                  <span className="text-[#18181B] dark:text-[#F4F4F5]">{copy.demoPrimary}</span>
                  <span className="text-[#8B5CF6]">{copy.demoAccent}</span>
                </h2>
              </LandingReveal>
              <LandingReveal className="landing-demo-stage" delayMs={70}>
                <ProductDemo locale={locale} />
              </LandingReveal>
            </div>
          </div>
        </section>

        <section className="landing-page-section landing-trust-section">
          <div className="landing-container">
            <div className="landing-trust-grid landing-trust-panel">
              <LandingReveal className="landing-trust-heading-wrap">
                <h2 className="landing-trust-heading text-balance">
                  <span className="text-[#F4F4F5]">{copy.trustPrimary}</span>
                  <span className="text-[#8B5CF6]">{copy.trustAccent}</span>
                </h2>
              </LandingReveal>

              <div className="landing-trust-list">
                {[
                  { icon: VolumeX, text: copy.trustItems[0] },
                  { icon: User, text: copy.trustItems[1] },
                  { icon: Wind, text: copy.trustItems[2] },
                  { icon: BookOpen, text: copy.trustItems[3] },
                ].map((item, index) => (
                  <LandingReveal key={item.text} delayMs={index * 70}>
                    <div className="landing-trust-item card-shadow">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#27272A]">
                        <item.icon className="landing-trust-icon text-[#A1A1AA]" />
                      </div>
                      <p className="landing-trust-text text-white">{item.text}</p>
                    </div>
                  </LandingReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-page-section landing-supply-section">
          <LandingReveal className="landing-container landing-section-block text-center">
            <h2 className="landing-section-title text-balance lg:whitespace-nowrap">
              <span className="text-[#18181B] dark:text-[#F4F4F5]">{copy.supplyPrimary}</span>
              <span className="text-[#8B5CF6]">{copy.supplyAccent}</span>
            </h2>
            <p className="landing-subtitle landing-section-subtitle text-[#666671] dark:text-[#8C8C99]">
              {copy.supplySubtitle}
            </p>
            <div className="landing-block-gap landing-supply-grid">
              {[
                { icon: Zap, ...copy.supplyCards[0] },
                { icon: RefreshCw, ...copy.supplyCards[1] },
                { icon: Shield, ...copy.supplyCards[2] },
              ].map((item, index) => (
                <LandingReveal key={item.title} delayMs={index * 70}>
                  <div className="landing-supply-card card-shadow">
                    <div className="landing-supply-icon-wrap">
                      <item.icon className="landing-supply-icon text-[#A1A1AA]" />
                    </div>
                    <div className="landing-supply-title-slot">
                      {item.code ? (
                        <code className="landing-card-title landing-code text-white">
                          {item.title}
                        </code>
                      ) : (
                        <h3 className="landing-card-title text-white">{item.title}</h3>
                      )}
                    </div>
                    <p className="landing-card-description text-[#8C8C99]">
                      {item.description}
                    </p>
                  </div>
                </LandingReveal>
              ))}
            </div>
          </LandingReveal>
        </section>

        <section className="landing-page-section landing-income-section">
          <LandingReveal className="landing-container text-center">
            <div className="landing-income-card card-shadow income-glow">
              <p className="landing-income-eyebrow text-[#666671] dark:text-[#8C8C99]">
                {copy.incomeEyebrow}
              </p>
              <h2 className="landing-income-title">
                <span className="landing-income-number text-[#18181B] dark:text-[#F4F4F5]">
                  {copy.incomeAmount}
                </span>
                <span className="landing-income-period text-[#666671] dark:text-[#8C8C99]">
                  {copy.incomePeriod}
                </span>
              </h2>
              <p className="landing-income-formula text-[#666671] dark:text-[#8C8C99]">
                {copy.incomeFormula}
              </p>
              <p className="landing-income-note text-[#666671] dark:text-[#8C8C99]">
                {copy.incomeNote}
              </p>
            </div>
          </LandingReveal>
        </section>

        <section className="landing-page-section landing-compare-section">
          <LandingReveal className="landing-container landing-compare-block">
            <div className="landing-compare-card overflow-x-auto rounded-2xl bg-white dark:bg-[#18181B] card-shadow">
              <table className="w-full border-collapse landing-table-text">
                <thead>
                  <tr>
                    <th className="landing-table-column landing-table-cell text-left text-[#666671] dark:text-[#8C8C99]" />
                    <th className="landing-table-column landing-table-cell text-center text-[#666671] dark:text-[#8C8C99]">
                      {copy.compareHeaders[0]}
                    </th>
                    <th className="landing-table-column landing-table-cell text-center text-[#666671] dark:text-[#8C8C99]">
                      {copy.compareHeaders[1]}
                    </th>
                    <th className="landing-table-column landing-table-cell landing-table-summon-head text-center">
                      {copy.compareHeaders[2]}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {copy.compareRows.map((row) => (
                    <tr key={row.label} className="border-t border-[#E4E4E7] dark:border-[#27272A]">
                      <td className="landing-table-rowhead landing-table-cell text-[#18181B] dark:text-[#F4F4F5]">
                        {row.label}
                      </td>
                      <td className="landing-table-cell text-center text-[#666671] dark:text-[#8C8C99]">
                        <div className="flex items-center justify-center gap-2">
                          <X className="h-4 w-4 text-[#666671]" />
                          {row.generic}
                        </div>
                      </td>
                      <td className="landing-table-cell text-center text-[#666671] dark:text-[#8C8C99]">
                        <div className="flex items-center justify-center gap-2">
                          <X className="h-4 w-4 text-[#666671]" />
                          {row.gpt}
                        </div>
                      </td>
                      <td className="landing-table-cell landing-table-summon text-center text-[#18181B] dark:text-[#F4F4F5]">
                        <div className="flex items-center justify-center gap-2">
                          <Check className="h-4 w-4 text-white" />
                          {row.summon}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </LandingReveal>
        </section>

        <section className="landing-page-section landing-final-section">
          <LandingReveal className="landing-container landing-final-block relative z-10 text-center">
            <div className="landing-final-shell">
              <div className="landing-final-stack">
                <h2 className="landing-section-title landing-final-title text-balance lg:whitespace-nowrap text-[#18181B] dark:text-[#F4F4F5]">
                  {copy.ctaTitle}
                </h2>
                <div className="landing-final-cta-stack">
                  <Link href="/early-access?source=landing-final" locale={locale}>
                    <Button
                      size="lg"
                      className="landing-primary-button min-w-[220px] bg-[#8B5CF6] text-white transition-all duration-200 hover:bg-[#7C3AED]"
                    >
                      {copy.apply}
                    </Button>
                  </Link>
              <Link href="/login" locale={locale} className="landing-invite-entry">
                <span>{locale === "zh" ? "已获邀请" : "Invited"}</span>
                <span className="landing-invite-entry-arrow" aria-hidden="true">→</span>
              </Link>
                </div>
              </div>
            </div>
          </LandingReveal>
        </section>
      </main>

      <footer className="landing-footer-shell">
        <div className="landing-container flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#18181B] dark:text-[#F4F4F5]" />
            <span className="font-semibold text-[#18181B] dark:text-[#F4F4F5]">{copy.navLabel}</span>
          </div>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Asuka-wx/Summon-Ai"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-social-link"
                aria-label={copy.githubLabel}
              >
                <Github className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </a>
              <a
                href="https://x.com/Summonai00"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-social-link"
                aria-label="Twitter/X"
              >
                <svg
                  className="h-[18px] w-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z" />
                </svg>
              </a>
            </div>
            <p className="landing-footer-text text-center text-[#666671] dark:text-[#8C8C99] sm:text-left">
              {copy.copyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
