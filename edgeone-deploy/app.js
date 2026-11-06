(() => {
  'use strict';

  const STORAGE_KEY = 'apex-scrim-scoreboard-v1';
  const ADMIN_SESSION_KEY = 'apex-scrim-admin-session-v1';
  const CLOUD_CONFIG_KEY = 'apex-scrim-cloud-config-v1';
  const ROSTER_BASELINE_KEY = 'apex-scrim-roster-baseline-v1';
  const ROSTER_BASELINE_SEED_KEY = 'apex-scrim-roster-baseline-seed-v1';
  const ROSTER_BASELINE_SEED = 'current-roster-v3';
  const MAX_TEAMS = 20;
  const MAX_KILLS = 99;
  const MAX_MATCHES = 500;
  const PLACEMENT_POINTS = [10, 7, 5, 3, 2, 1];
  const MAPS = ['世界边缘', '奥林匹斯', '残月', '风暴点', '破碎月亮', '其他'];
  const RANKS = {
    rookie: { name: '菜鸟', color: '#98A4B3', icon: 'assets/ranks/rookie.png' },
    bronze: { name: '青铜', color: '#C57B4B', icon: 'assets/ranks/bronze.png' },
    silver: { name: '白银', color: '#CAD4DE', icon: 'assets/ranks/silver.png' },
    gold: { name: '黄金', color: '#F5C451', icon: 'assets/ranks/gold.png' },
    platinum: { name: '铂金', color: '#6FFFFA', icon: 'assets/ranks/platinum.png' },
    diamond: { name: '钻石', color: '#2EB9FF', icon: 'assets/ranks/diamond.png' },
    master: { name: '大师', color: '#A462FF', icon: 'assets/ranks/master.png' },
    predator: { name: '猎杀', color: '#DC1717', icon: 'assets/ranks/predator.png' }
  };
  const RANK_KEYS = ['', 'rookie', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'predator'];
  const LEGENDS = typeof APEX_LEGENDS !== 'undefined' ? APEX_LEGENDS : [];
  const LEGEND_BY_ID = new Map(LEGENDS.map((legend) => [legend.id, legend]));
  const LEGEND_IDS = new Set(LEGENDS.map((legend) => legend.id));

  const player = (name, rank = '') => ({ name, rank });
  const LEGACY_EVENT_NAME = 'APEX 群内娱乐赛';
  const EVENT_NAME = 'APEX 青提杯';
  const LEGACY_EVENT_SUBTITLE = 'ALGS MATCH POINT · 内部娱乐赛';
  const EVENT_SUBTITLE = '我在猎杀等你们🅰️';
  const DEFAULT_EVENT = {
    name: EVENT_NAME,
    subtitle: EVENT_SUBTITLE,
    threshold: 50,
    banReleaseMode: 'earliest',
    legendCopyLimit: '5',
    backgroundStyle: 'prism'
  };

  const DEFAULT_TEAMS = [
    { id: 'team-1', name: 'LEX', players: [player('玉玉', 'master'), player('佳得乐', 'master'), player('杨叔', 'master')], restricted: true },
    { id: 'team-2', name: 'GuoYiZhi', players: [player('青提', 'predator'), player('风吟', 'diamond'), player('乐乐', 'master')], restricted: true },
    { id: 'team-3', name: 'NAIWA', players: [player('芋头', 'platinum'), player('白川', 'master'), player('哈哈', 'diamond')], restricted: false },
    { id: 'team-6', name: '哥哥轻点打', players: [player('老杰瑞', 'diamond'), player('kita', 'diamond'), player('yy', 'bronze')], restricted: false },
    { id: 'team-7', name: '菜鸟驿站', players: [player('乐乐大王', 'diamond'), player('ZZ', 'diamond'), player('17', 'silver')], restricted: false },
    { id: 'team-8', name: '0霍人', players: [player('零度', 'diamond'), player('霍金', 'diamond'), player('自由', 'diamond')], restricted: false },
    { id: 'team-11', name: '六神花露水', players: [player('61', 'platinum'), player('洪', 'gold'), player('三九', 'platinum')], restricted: false },
    { id: 'team-12', name: '吃我一戟吧', players: [player('珺', 'diamond'), player('emo的喜', 'diamond'), player('条子', 'diamond')], restricted: false },
    { id: 'team-13', name: '降解蛋的跳石', players: [player('less', 'diamond'), player('老神父', 'diamond'), player('ZHC', 'gold')], restricted: false },
    { id: 'team-16', name: '圈边三杰', players: [player('暮十一', 'diamond'), player('小鱼', 'diamond'), player('狗卷', 'diamond')], restricted: false },
    { id: 'team-17', name: 'GAG', players: [player('Eddie', 'predator'), player('拾柒', 'master'), player('阿灿', 'predator')], restricted: true },
    { id: 'team-18', name: '麦麦脆汁鸡', players: [player('言小意', 'gold'), player('Emo', 'master'), player('Echo', 'master')], restricted: true }
  ];

  const ICONS = {
    chevron: '<svg class="match-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    edit: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 13.7-.8 3.1 3.1-.8L15.5 6.8l-2.3-2.3L4 13.7Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m11.7 6 2.3 2.3" stroke="currentColor" stroke-width="1.5"/></svg>',
    trash: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6h11M8 3.6h4M6.2 6l.7 10h6.2l.7-10M8.4 8.7v4.8M11.6 8.7v4.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function clampInt(value, min, max, fallback = min) {
    const number = Math.floor(Number(value));
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function normalizeRank(value) {
    const key = String(value || '').trim().toLowerCase();
    return RANK_KEYS.includes(key) ? key : '';
  }

  function rankMeta(rank) {
    return RANKS[normalizeRank(rank)] || null;
  }

  function rankAccentFromPlayers(players) {
    let bestIndex = 0;
    let bestColor = '#94a3b8';
    (players || []).forEach((item) => {
      if (!String(item && item.name || '').trim()) return;
      const key = normalizeRank(item && item.rank);
      const index = RANK_KEYS.indexOf(key);
      if (index > bestIndex) {
        bestIndex = index;
        bestColor = RANKS[key].color;
      }
    });
    return bestColor;
  }

  function teamAccentColor(team) {
    return rankAccentFromPlayers(team && team.players);
  }

  function defaultRankFor(teamId, playerName, playerIndex) {
    const team = DEFAULT_TEAMS.find((item) => item.id === teamId);
    if (!team) return '';
    const defaultPlayer = team.players[playerIndex];
    if (!defaultPlayer || defaultPlayer.name !== playerName) return '';
    return defaultPlayer.rank || '';
  }

  function uid(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeLegendPicks(rawPicks) {
    const picks = Array.isArray(rawPicks) ? rawPicks : [];
    return Array.from({ length: 3 }, (_, index) => {
      const id = String(picks[index] || '').trim();
      return LEGEND_IDS.has(id) ? id : null;
    });
  }

  function getLegendById(id) {
    return LEGEND_BY_ID.get(String(id || '')) || null;
  }

  function legendThumbSrc(legend) {
    return legend ? `assets/legends/thumbs/${legend.id}.png` : '';
  }

  function legendCardSrc(legend) {
    return legend ? `assets/legends/cards/${legend.id}.png` : '';
  }

  let legendCardsPreload = null;

  function preloadLegendCards() {
    if (legendCardsPreload) return legendCardsPreload;
    legendCardsPreload = Promise.all(LEGENDS.map((legend) => new Promise((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      const done = () => resolve();
      image.onload = () => {
        if (typeof image.decode === 'function') {
          image.decode().then(done, done);
        } else {
          done();
        }
      };
      image.onerror = done;
      image.src = legendCardSrc(legend);
    })));
    return legendCardsPreload;
  }

  function normalizeLegendDraft(rawDraft, teams) {
    if (!rawDraft || typeof rawDraft !== 'object' || !rawDraft.picks || typeof rawDraft.picks !== 'object') {
      return null;
    }
    const picks = {};
    let hasPick = false;
    teams.forEach((team) => {
      const teamPicks = normalizeLegendPicks(rawDraft.picks[team.id]);
      picks[team.id] = teamPicks;
      if (teamPicks.some(Boolean)) hasPick = true;
    });
    if (!hasPick) return null;
    return {
      picks,
      createdAt: typeof rawDraft.createdAt === 'string' ? rawDraft.createdAt : new Date().toISOString(),
      updatedAt: typeof rawDraft.updatedAt === 'string' ? rawDraft.updatedAt : new Date().toISOString()
    };
  }

  function getPlacementPoints(placement) {
    const rank = Number(placement);
    if (!Number.isInteger(rank) || rank < 1) return 0;
    if (rank >= 7) return 0;
    return PLACEMENT_POINTS[rank - 1] || 0;
  }

  function formatTimelineStamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return { time: '--:--', date: '--/--', iso: '', full: '' };
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return {
      time,
      date: `${month}/${day}`,
      iso: date.toISOString(),
      full: date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    };
  }

  function defaultState() {
    return {
      version: 3,
      event: { ...DEFAULT_EVENT },
      teams: deepClone(DEFAULT_TEAMS).map(({ color, ...team }) => team),
      matches: [],
      legendDraft: null,
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('数据格式无法识别');

    const rawTeams = Array.isArray(raw.teams) ? raw.teams : [];
    if (!rawTeams.length) throw new Error('数据中没有队伍');

    const teams = [];
    const usedIds = new Set();
    rawTeams.slice(0, MAX_TEAMS).forEach((rawTeam, index) => {
      if (!rawTeam || typeof rawTeam !== 'object') return;
      let id = typeof rawTeam.id === 'string' ? rawTeam.id.trim() : '';
      if (!id || usedIds.has(id)) id = uid('team');
      usedIds.add(id);
      const name = String(rawTeam.name || `TEAM ${index + 1}`).trim().slice(0, 20) || `TEAM ${index + 1}`;
      const rawPlayers = Array.isArray(rawTeam.players) ? rawTeam.players : [];
      const rawRanks = Array.isArray(rawTeam.ranks) ? rawTeam.ranks : [];
      const players = Array.from({ length: 3 }, (_, playerIndex) => {
        const rawPlayer = rawPlayers[playerIndex];
        if (rawPlayer && typeof rawPlayer === 'object') {
          const playerName = String(rawPlayer.name || '').trim().slice(0, 20);
          return { name: playerName, rank: normalizeRank(rawPlayer.rank) };
        }
        const playerName = String(rawPlayer || '').trim().slice(0, 20);
        const rank = normalizeRank(rawRanks[playerIndex]) || defaultRankFor(id, playerName, playerIndex);
        return { name: playerName, rank };
      });
      teams.push({ id, name, players, restricted: Boolean(rawTeam.restricted) });
    });

    if (!teams.length) throw new Error('数据中没有有效队伍');

    const teamIds = new Set(teams.map((team) => team.id));
    const matches = [];
    const usedMatchIds = new Set();
    const rawMatches = Array.isArray(raw.matches) ? raw.matches : [];

    rawMatches.slice(0, MAX_MATCHES).forEach((rawMatch, matchIndex) => {
      if (!rawMatch || typeof rawMatch !== 'object' || !Array.isArray(rawMatch.results)) return;
      const seen = new Set();
      const results = [];

      rawMatch.results.forEach((rawResult, resultIndex) => {
        if (!rawResult || typeof rawResult !== 'object') return;
        const teamId = typeof rawResult.teamId === 'string' ? rawResult.teamId : '';
        if (!teamIds.has(teamId) || seen.has(teamId)) return;
        seen.add(teamId);
        const placement = clampInt(rawResult.placement, 1, MAX_TEAMS, resultIndex + 1);
        const kills = clampInt(rawResult.kills, 0, MAX_KILLS, 0);
        const legends = normalizeLegendPicks(rawResult.legends);
        results.push({ teamId, placement, kills, legends });
      });

      if (!results.length) return;
      results.sort((a, b) => a.placement - b.placement);
      const normalizedResults = results.map((result, index) => ({
        teamId: result.teamId,
        placement: index + 1,
        kills: result.kills,
        legends: result.legends
      }));

      let matchId = typeof rawMatch.id === 'string' ? rawMatch.id.trim() : '';
      if (!matchId || usedMatchIds.has(matchId)) matchId = uid('match');
      usedMatchIds.add(matchId);

      const map = MAPS.includes(rawMatch.map) ? rawMatch.map : (String(rawMatch.map || '').trim().slice(0, 20) || MAPS[matchIndex % 5]);
      const createdAt = Number.isNaN(new Date(rawMatch.createdAt).getTime())
        ? new Date().toISOString()
        : new Date(rawMatch.createdAt).toISOString();

      matches.push({ id: matchId, map, createdAt, results: normalizedResults });
    });

    const threshold = clampInt(raw.event && raw.event.threshold, 1, 999, 50);
    const name = String((raw.event && raw.event.name) || DEFAULT_EVENT.name).trim().slice(0, 28) || DEFAULT_EVENT.name;
    const subtitle = String((raw.event && raw.event.subtitle) || '').trim().slice(0, 48);
    const rawVersion = Number(raw.version) || 0;
    const banReleaseMode = rawVersion < 3
      ? 'earliest'
      : (raw.event && raw.event.banReleaseMode === 'all' ? 'all' : 'earliest');
    const rawCopyLimit = raw.event && String(raw.event.legendCopyLimit || '');
    const legendCopyLimit = ['3', '5', 'all'].includes(rawCopyLimit) ? rawCopyLimit : '5';
    const backgroundStyle = raw.event && raw.event.backgroundStyle === 'classic' ? 'classic' : 'prism';

    return {
      version: 3,
      event: { name, subtitle, threshold, banReleaseMode, legendCopyLimit, backgroundStyle },
      teams,
      matches,
      legendDraft: normalizeLegendDraft(raw.legendDraft, teams),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString()
    };
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      console.warn('读取本地数据失败，已使用初始数据。', error);
      return defaultState();
    }
  }

  function normalizeCloudConfig(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
      token: String(source.token || '')
    };
  }

  function loadCloudConfig() {
    try {
      const raw = window.localStorage.getItem(CLOUD_CONFIG_KEY);
      return normalizeCloudConfig(raw ? JSON.parse(raw) : null);
    } catch {
      return normalizeCloudConfig(null);
    }
  }

  function saveCloudConfig() {
    try {
      window.localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cloudConfig));
    } catch (error) {
      console.warn('存储设置保存失败', error);
    }
  }

  function loadRosterBaseline() {
    try {
      const raw = window.localStorage.getItem(ROSTER_BASELINE_KEY);
      if (!raw) return null;
      const teams = JSON.parse(raw);
      return Array.isArray(teams) && teams.length ? deepClone(teams) : null;
    } catch {
      return null;
    }
  }

  function saveRosterBaseline(teams) {
    try {
      window.localStorage.setItem(ROSTER_BASELINE_KEY, JSON.stringify(teams));
    } catch (error) {
      console.warn('初始名单保存失败', error);
    }
  }

  function ensureRosterBaseline() {
    try {
      if (window.localStorage.getItem(ROSTER_BASELINE_SEED_KEY) !== ROSTER_BASELINE_SEED) {
        saveRosterBaseline(DEFAULT_TEAMS);
        window.localStorage.setItem(ROSTER_BASELINE_SEED_KEY, ROSTER_BASELINE_SEED);
        return;
      }
    } catch (error) {
      console.warn('初始名单标记写入失败', error);
    }
    if (!loadRosterBaseline()) saveRosterBaseline(appState.teams);
  }

  function refreshRosterBaselineIfPristine() {
    if (!appState.matches.length) saveRosterBaseline(appState.teams);
  }

  let appState = loadState();
  let cloudConfig = loadCloudConfig();
  let cloudReady = false;
  let cloudPushTimer = 0;
  let adminMode = false;
  let entryDraft = null;
  let draggedTeamId = null;
  let entryDragSource = null;
  let entryDragSuppressed = false;
  let confirmResolver = null;
  let legendDraftEditor = null;
  let legendPickerTarget = null;
  let legendPickerBuilt = false;
  let legendReportMatchId = null;

  const els = {
    body: document.body,
    bootLoader: $('#bootLoader'),
    bootStatus: $('#bootStatus'),
    brand: $('.brand'),
    brandEventName: $('#brandEventName'),
    eventTitle: $('#eventTitle'),
    eventSubtitle: $('#eventSubtitle'),
    statusText: $('#statusText'),
    matchMeta: $('#matchMeta'),
    liveDot: $('#liveDot'),
    statMatches: $('#statMatches'),
    statThreshold: $('#statThreshold'),
    statTeams: $('#statTeams'),
    statMatchPoint: $('#statMatchPoint'),
    championStrip: $('#championStrip'),
    championStripName: $('#championStripName'),
    championStripDetail: $('#championStripDetail'),
    championStripPoints: $('#championStripPoints'),
    standingsColumns: $('#standingsColumns'),
    addMatchBtn: $('#addMatchBtn'),
    addMatchBtn2: $('#addMatchBtn2'),
    undoMatchBtn: $('#undoMatchBtn'),
    banOverview: $('#banOverview'),
    matchesList: $('#matchesList'),
    teamGrid: $('#teamGrid'),
    rosterSummary: $('#rosterSummary'),
    addTeamBtn: $('#addTeamBtn'),
    settingsForm: $('#settingsForm'),
    settingName: $('#settingName'),
    settingSubtitle: $('#settingSubtitle'),
    settingThreshold: $('#settingThreshold'),
    settingLegendCopyLimit: $('#settingLegendCopyLimit'),
    settingBackgroundStyle: $('#settingBackgroundStyle'),
    settingBanModes: $$('input[name="banReleaseMode"]'),
    settingsNote: $('#settingsNote'),
    storageNote: $('.storage-note'),
    storageNoteTitle: $('#storageNoteTitle'),
    storageNoteText: $('#storageNoteText'),
    cloudStorageForm: $('#cloudStorageForm'),
    cloudFields: $('#cloudFields'),
    cloudToken: $('#cloudToken'),
    cloudTestBtn: $('#cloudTestBtn'),
    cloudPullBtn: $('#cloudPullBtn'),
    cloudPushBtn: $('#cloudPushBtn'),
    cloudShareBtn: $('#cloudShareBtn'),
    cloudStatus: $('#cloudStatus'),
    rulesGuideBtn: $('#rulesGuideBtn'),
    rulesGuideDialog: $('#rulesGuideDialog'),
    rulesGuideCloseBtn: $('#rulesGuideCloseBtn'),
    rulesGuideOkBtn: $('#rulesGuideOkBtn'),
    rulesGuideEventName: $('#rulesGuideEventName'),
    rulesGuideThreshold: $('#rulesGuideThreshold'),
    authDialog: $('#authDialog'),
    authForm: $('#authForm'),
    authPassword: $('#authPassword'),
    authError: $('#authError'),
    authCloseBtn: $('#authCloseBtn'),
    authCancelBtn: $('#authCancelBtn'),
    clearMatchesBtn: $('#clearMatchesBtn'),
    resetAllBtn: $('#resetAllBtn'),
    exportBtn: $('#exportBtn'),
    importBtn: $('#importBtn'),
    importFile: $('#importFile'),
    entryDialog: $('#entryDialog'),
    entryDialogTitle: $('#entryDialogTitle'),
    entryMap: $('#entryMap'),
    entryList: $('#entryList'),
    entryEndDrop: $('#entryEndDrop'),
    entryPool: $('#entryPool'),
    entryKillTotal: $('#entryKillTotal'),
    entryPlacedTotal: $('#entryPlacedTotal'),
    entryTeamTotal: $('#entryTeamTotal'),
    entryPoolCount: $('#entryPoolCount'),
    entrySaveBtn: $('#entrySaveBtn'),
    entrySortBtn: $('#entrySortBtn'),
    entryLegendBtn: $('#entryLegendBtn'),
    entryLegendStatus: $('#entryLegendStatus'),
    legendEntryBtn: $('#legendEntryBtn'),
    legendDialog: $('#legendDialog'),
    legendDialogTitle: $('#legendDialogTitle'),
    legendDialogCompletion: $('#legendDialogCompletion'),
    legendTeams: $('#legendTeams'),
    legendRateSummary: $('#legendRateSummary'),
    legendRateList: $('#legendRateList'),
    legendRateEmpty: $('#legendRateEmpty'),
    legendFootHint: $('#legendFootHint'),
    legendCopyBtn: $('#legendCopyBtn'),
    legendSaveBtn: $('#legendSaveBtn'),
    legendCancelBtn: $('#legendCancelBtn'),
    legendCloseBtn: $('#legendCloseBtn'),
    legendPickerDialog: $('#legendPickerDialog'),
    legendPickerTitle: $('#legendPickerTitle'),
    legendPickerSearch: $('#legendPickerSearch'),
    legendPickerGrid: $('#legendPickerGrid'),
    legendPickerCloseBtn: $('#legendPickerCloseBtn'),
    legendClearBtn: $('#legendClearBtn'),
    legendReportDialog: $('#legendReportDialog'),
    legendReportTitle: $('#legendReportTitle'),
    legendReportMeta: $('#legendReportMeta'),
    legendReportBan: $('#legendReportBan'),
    legendReportList: $('#legendReportList'),
    legendReportCopyBtn: $('#legendReportCopyBtn'),
    legendReportCloseBtn: $('#legendReportCloseBtn'),
    legendReportCloseBtn2: $('#legendReportCloseBtn2'),
    teamDialog: $('#teamDialog'),
    teamDialogTitle: $('#teamDialogTitle'),
    teamForm: $('#teamForm'),
    teamId: $('#teamId'),
    teamName: $('#teamName'),
    teamRestricted: $('#teamRestricted'),
    playerInputs: $$('.player-input'),
    playerRanks: $$('.player-rank'),
    rankPreviews: $$('.rank-preview'),
    rankSlots: $$('.rank-preview-slot'),
    teamPreview: $('#teamPreview'),
    confirmDialog: $('#confirmDialog'),
    confirmTitle: $('#confirmTitle'),
    confirmMessage: $('#confirmMessage'),
    confirmOkBtn: $('#confirmOkBtn'),
    championDialog: $('#championDialog'),
    championTeam: $('#championTeam'),
    championConfirmBtn: $('#championConfirmBtn'),
    toastStack: $('#toastStack')
  };

  function cloudStateUrl() {
    return '/api/state';
  }

  function setBootStatus(message) {
    if (els.bootStatus) els.bootStatus.textContent = message;
  }

  function hideBootLoader() {
    if (!els.bootLoader) return;
    document.body.classList.remove('is-booting');
    els.bootLoader.classList.add('is-hidden');
    window.setTimeout(() => {
      if (els.bootLoader && els.bootLoader.parentNode) els.bootLoader.remove();
    }, 360);
  }

  function setCloudStatus(message, tone = '') {
    if (!els.cloudStatus) return;
    els.cloudStatus.textContent = message;
    els.cloudStatus.className = `cloud-status${tone ? ` is-${tone}` : ''}`;
  }

  function syncTimeLabel(date = new Date()) {
    return date.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  async function cloudRequest(method, payload) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const headers = { Accept: 'application/json' };
      if (payload !== undefined) headers['Content-Type'] = 'application/json';
      if (cloudConfig.token) headers.Authorization = `Bearer ${cloudConfig.token}`;
      const response = await fetch(cloudStateUrl(), {
        method,
        headers,
        body: payload === undefined ? undefined : JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store',
        priority: 'high'
      });
      const text = await response.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }
      if (!response.ok) throw new Error(data && data.error ? data.error : `HTTP ${response.status}`);
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('连接超时');
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function updateCloudSettingsUI() {
    if (!els.cloudToken) return;
    if (document.activeElement !== els.cloudToken) els.cloudToken.value = cloudConfig.token;

    if (els.storageNote) els.storageNote.classList.add('is-cloud');
    if (els.storageNoteTitle) els.storageNoteTitle.textContent = 'Netlify 云端存储';
    if (els.storageNoteText) {
      els.storageNoteText.textContent = '数据保存到 Netlify Blobs，当前浏览器保留一份本地缓存。';
    }
  }

  function renderCloudSettings() {
    updateCloudSettingsUI();
  }

  function scheduleCloudPush() {
    if (!cloudReady || !adminMode) return;
    window.clearTimeout(cloudPushTimer);
    setCloudStatus('数据有变更，准备同步到云端…', 'busy');
    cloudPushTimer = window.setTimeout(() => {
      pushCloudState().catch((error) => {
        setCloudStatus(`云端同步失败：${error.message}`, 'error');
      });
    }, 650);
  }

  async function pushCloudState({ manual = false } = {}) {
    if (!adminMode) throw new Error('只读模式无法上传云端数据');
    setCloudStatus('正在上传当前数据…', 'busy');
    const data = await cloudRequest('PUT', { state: appState });
    setCloudStatus(`已同步到云端 · ${syncTimeLabel()}`, 'ok');
    if (manual) showToast('当前数据已上传到 Netlify 云端。', 'success');
    return data;
  }

  async function hydrateCloudState({ silent = false } = {}) {
    setBootStatus('正在读取赛事数据…');
    setCloudStatus('正在读取云端数据…', 'busy');
    try {
      const data = await cloudRequest('GET');
      if (!data || !data.state) {
        setBootStatus('云端暂无数据，载入本地缓存…');
        setCloudStatus('云端暂无数据；可在管理模式下上传当前数据。', 'warn');
        return false;
      }
      appState = normalizeState(data.state);
      migrateLegacyEventName();
      saveState({ skipCloud: true });
      refreshRosterBaselineIfPristine();
      renderAll();
      applyAuthUI();
      applyView();
      setBootStatus('数据已就绪，正在加载贴图…');
      setCloudStatus(`已载入云端数据 · ${syncTimeLabel()}`, 'ok');
      if (!silent) showToast('已载入云端数据。', 'success');
      return true;
    } catch (error) {
      setBootStatus('云端连接失败，载入本地缓存…');
      setCloudStatus(`云端读取失败：${error.message}；继续使用本地缓存。`, 'error');
      return false;
    } finally {
      cloudReady = true;
    }
  }

  async function testCloudConnection({ manual = true } = {}) {
    setCloudStatus('正在测试连接…', 'busy');
    try {
      const data = await cloudRequest('GET');
      const hasData = Boolean(data && data.state);
      setCloudStatus(hasData ? '连接成功，云端已有数据。' : '连接成功，云端暂无数据。', 'ok');
      if (manual) showToast(hasData ? '连接成功，云端已有数据。' : '连接成功，云端暂无数据。');
      return true;
    } catch (error) {
      setCloudStatus(`连接失败：${error.message}`, 'error');
      if (manual) showToast(`连接失败：${error.message}`, 'error', 4200);
      return false;
    }
  }

  function migrateLegacyEventName() {
    let changed = false;
    if (appState && appState.event) {
      if (appState.event.name === LEGACY_EVENT_NAME) {
        appState.event.name = EVENT_NAME;
        changed = true;
      }
      if (appState.event.subtitle === LEGACY_EVENT_SUBTITLE) {
        appState.event.subtitle = EVENT_SUBTITLE;
        changed = true;
      }
    }
    if (changed) saveState({ skipCloud: true });
  }

  function saveState(options = {}) {
    appState.updatedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (error) {
      console.error('保存失败', error);
      showToast('本地保存失败，请先导出备份，避免数据丢失。', 'error');
    }
    if (!options.skipCloud) scheduleCloudPush();
  }

  function getTeam(teamId) {
    return appState.teams.find((team) => team.id === teamId) || null;
  }

  function getPlayerName(item) {
    return item && typeof item === 'object' ? String(item.name || '').trim() : String(item || '').trim();
  }

  function teamPlayerCount(team) {
    return team.players.reduce((sum, item) => sum + (getPlayerName(item) ? 1 : 0), 0);
  }

  function playerText(team) {
    return team.players.map(getPlayerName).filter(Boolean).join(' · ');
  }

  function emptyLegendPicks() {
    return Object.fromEntries(appState.teams.map((team) => [team.id, Array(3).fill(null)]));
  }

  function getTeamLegendPicks(teamId) {
    return normalizeLegendPicks(appState.legendDraft && appState.legendDraft.picks
      ? appState.legendDraft.picks[teamId]
      : []);
  }

  function getLegendCompletion(teamIds = appState.teams.map((team) => team.id)) {
    let required = 0;
    let selected = 0;
    const missing = [];

    teamIds.forEach((teamId) => {
      const team = getTeam(teamId);
      if (!team) return;
      const picks = getTeamLegendPicks(teamId);
      team.players.forEach((player, index) => {
        if (!getPlayerName(player)) return;
        required += 1;
        if (getLegendById(picks[index])) {
          selected += 1;
        } else {
          missing.push({ teamId, playerIndex: index, playerName: getPlayerName(player) });
        }
      });
    });

    return { required, selected, missing, complete: missing.length === 0 };
  }

  function buildLegendReportFromPicks(picksByTeam, teamIds, placementByTeam = null) {
    const counts = new Map();
    let total = 0;
    let selected = 0;

    teamIds.forEach((teamId) => {
      const team = getTeam(teamId);
      if (!team) return;
      const picks = normalizeLegendPicks(picksByTeam ? picksByTeam[teamId] : []);
      const teamPlacement = placementByTeam && Number.isFinite(Number(placementByTeam[teamId]))
        ? Number(placementByTeam[teamId])
        : Infinity;
      team.players.forEach((player, index) => {
        if (!getPlayerName(player)) return;
        total += 1;
        const legend = getLegendById(picks[index]);
        if (!legend) return;
        selected += 1;
        const entry = counts.get(legend.id) || { legend, count: 0, bestPlacement: Infinity };
        entry.count += 1;
        entry.bestPlacement = Math.min(entry.bestPlacement, teamPlacement);
        counts.set(legend.id, entry);
      });
    });

    const rows = [...counts.values()]
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        if (a.bestPlacement !== b.bestPlacement) return a.bestPlacement - b.bestPlacement;
        return a.legend.name.localeCompare(b.legend.name, 'zh-CN');
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        rate: total ? (entry.count / total) * 100 : 0
      }));

    return { rows, total, selected, missing: total - selected };
  }

  function buildLegendReportFromDraft() {
    return buildLegendReportFromPicks(
      appState.legendDraft ? appState.legendDraft.picks : {},
      appState.teams.map((team) => team.id)
    );
  }

  function buildLegendReportFromMatch(match) {
    const picksByTeam = {};
    const placementByTeam = {};
    (match.results || []).forEach((result) => {
      picksByTeam[result.teamId] = normalizeLegendPicks(result.legends);
      placementByTeam[result.teamId] = result.placement;
    });
    return buildLegendReportFromPicks(
      picksByTeam,
      (match.results || []).map((result) => result.teamId),
      placementByTeam
    );
  }

  function legendRateRowsHTML(report) {
    return report.rows.map((row) => `
      <div class="legend-rate-row${row.rank <= 3 ? ' is-top' : ''}">
        <span class="legend-rate-rank">${String(row.rank).padStart(2, '0')}</span>
        <span class="legend-rate-art"><img src="${escapeHTML(legendThumbSrc(row.legend))}" alt="" loading="lazy" decoding="async" fetchpriority="low" /></span>
        <span class="legend-rate-name">${escapeHTML(row.legend.name)}</span>
        <span class="legend-rate-count">${row.count}</span>
        <span class="legend-rate-bar"><i style="width:${row.rate.toFixed(1)}%"></i></span>
        <span class="legend-rate-pct">${row.rate.toFixed(1)}%</span>
      </div>
    `).join('');
  }

  function findLegendBanCandidate(report, bannedIds) {
    return report.rows.find((row) => (
      row.legend.id !== 'crypto' && !bannedIds.has(row.legend.id)
    )) || null;
  }

  function applyLegendBanStep(banned, report) {
    const candidate = findLegendBanCandidate(report, new Set(banned));
    if (!candidate) {
      return { banned, candidate: null, released: [], releaseCategory: null };
    }

    const candidateId = candidate.legend.id;
    const category = candidate.legend.category;
    const categoryIds = LEGENDS
      .filter((legend) => legend.category === category && legend.id !== 'crypto')
      .map((legend) => legend.id);
    const nextBanned = [...banned, candidateId];
    const categoryBanned = nextBanned.filter((id) => categoryIds.includes(id));

    if (categoryIds.length && categoryBanned.length === categoryIds.length) {
      if (appState.event.banReleaseMode === 'earliest') {
        const earliest = nextBanned.find((id) => categoryIds.includes(id));
        return {
          banned: nextBanned.filter((id) => id !== earliest),
          candidate,
          released: earliest ? [getLegendById(earliest)].filter(Boolean) : [],
          releaseCategory: category
        };
      }
      return {
        banned: nextBanned.filter((id) => !categoryIds.includes(id)),
        candidate,
        released: categoryBanned.map((id) => getLegendById(id)).filter(Boolean),
        releaseCategory: category
      };
    }

    return { banned: nextBanned, candidate, released: [], releaseCategory: null };
  }

  function getLegendBanInfoForMatch(matchId) {
    let banned = [];
    let current = null;
    let released = [];
    let releaseCategory = null;

    for (const match of appState.matches) {
      const report = buildLegendReportFromMatch(match);
      const step = applyLegendBanStep(banned, report);
      banned = step.banned;
      if (match.id === matchId) {
        const candidate = step.candidate ? step.candidate.legend : null;
        current = candidate && step.banned.includes(candidate.id) ? candidate : null;
        released = step.released;
        releaseCategory = step.releaseCategory;
        break;
      }
    }

    return {
      current,
      cumulative: banned.map((id) => getLegendById(id)).filter(Boolean),
      released,
      releaseCategory
    };
  }

  function getLegendBanInfoForDraft(report) {
    let banned = [];
    appState.matches.forEach((match) => {
      const matchReport = buildLegendReportFromMatch(match);
      banned = applyLegendBanStep(banned, matchReport).banned;
    });
    const step = applyLegendBanStep(banned, report);
    const candidate = step.candidate ? step.candidate.legend : null;
    return {
      current: candidate && step.banned.includes(candidate.id) ? candidate : null,
      cumulative: step.banned.map((id) => getLegendById(id)).filter(Boolean),
      released: step.released,
      releaseCategory: step.releaseCategory
    };
  }

  function buildLegendBanTimeline() {
    let banned = [];
    const origins = new Map();
    const releases = [];

    appState.matches.forEach((match, index) => {
      const report = buildLegendReportFromMatch(match);
      const step = applyLegendBanStep(banned, report);
      const candidate = step.candidate ? step.candidate.legend : null;
      banned = step.banned;

      if (candidate && banned.includes(candidate.id)) {
        origins.set(candidate.id, index + 1);
      }
      step.released.forEach((legend) => origins.delete(legend.id));
      [...origins.keys()].forEach((id) => {
        if (!banned.includes(id)) origins.delete(id);
      });

      if (step.released.length) {
        releases.push({
          matchNumber: index + 1,
          category: step.releaseCategory,
          released: step.released,
          mode: appState.event.banReleaseMode === 'earliest' ? '最早解禁' : '全员解禁'
        });
      }
    });

    return {
      banned: banned
        .map((id) => ({ legend: getLegendById(id), origin: origins.get(id) }))
        .filter((item) => item.legend),
      releases
    };
  }

  function legendReportText(report, title, banInfo = null) {
    const copyLimit = appState.event.legendCopyLimit === '3'
      ? '3'
      : appState.event.legendCopyLimit === 'all' ? 'all' : '5';
    const limitLabel = copyLimit === '3' ? '前三' : copyLimit === 'all' ? '全部' : '前五';
    const rows = copyLimit === 'all' ? report.rows : report.rows.slice(0, Number(copyLimit));
    const lines = [`${title}（${limitLabel}）`, `已录入 ${report.selected}/${report.total} 名选手`];
    rows.forEach((row) => {
      lines.push(`${String(row.rank).padStart(2, '0')}  ${row.legend.name}  ${row.count} 次  ${row.rate.toFixed(1)}%`);
    });
    if (banInfo) {
      lines.push('', `本局 BAN：${banInfo.current ? banInfo.current.name : '无新增'}`);
      if (banInfo.cumulative.length) {
        lines.push(`累计 BAN：${banInfo.cumulative.map((legend) => legend.name).join(' / ')}`);
      }
      if (banInfo.released.length) {
        const mode = appState.event.banReleaseMode === 'earliest' ? '最早解禁' : '全员解禁';
        lines.push(`阵营解禁：${banInfo.releaseCategory} · ${banInfo.released.map((legend) => legend.name).join(' / ')}（${mode}）`);
      }
    }
    return lines.join('\n');
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  function rankBadge(item, size = '') {
    const meta = rankMeta(item && item.rank);
    const sizeClass = size ? ` ${size}` : '';
    if (!meta) {
      return `<span class="rank-badge empty${sizeClass}" title="未设置段位" aria-hidden="true"></span>`;
    }
    return `<span class="rank-badge${sizeClass}" style="--rank-color:${meta.color}" title="${meta.name}"><img src="${meta.icon}" alt="${meta.name}" loading="lazy" decoding="async" fetchpriority="low" /></span>`;
  }

  function playerChip(item, size = '', showRank = false) {
    const name = getPlayerName(item);
    if (!name) return '';
    const meta = rankMeta(item.rank);
    return `<span class="player-chip" style="--rank-color:${meta ? meta.color : 'transparent'}" title="${escapeHTML(name)} · ${meta ? meta.name : '未设置段位'}">${rankBadge(item, size)}<span class="player-chip-name">${escapeHTML(name)}</span>${showRank && meta ? `<span class="player-rank-inline">${meta.name}</span>` : ''}</span>`;
  }

  function playerChips(team, size = '', showRank = false) {
    return team.players.map((item) => playerChip(item, size, showRank)).filter(Boolean).join('');
  }

  function matchPlayersHTML(team, result) {
    const picks = normalizeLegendPicks(result && result.legends);
    let hasPlayer = false;
    const players = team.players.map((player, index) => {
      const name = getPlayerName(player);
      if (!name) return '<span class="match-player is-empty-slot" aria-hidden="true"></span>';
      hasPlayer = true;
      const legend = getLegendById(picks[index]);
      return `
        <span class="match-player" title="${legend ? escapeHTML(legend.name) : '未分配传奇'}">
          <span class="match-player-portrait${legend ? '' : ' is-empty'}">
            ${legend ? `<img src="${escapeHTML(legendThumbSrc(legend))}" alt="" loading="lazy" decoding="async" fetchpriority="low" />` : '?'}
          </span>
          <span class="match-player-copy">
            <b>${escapeHTML(name)}</b>
            <small>${legend ? escapeHTML(legend.name) : '未分配传奇'}</small>
          </span>
        </span>
      `;
    });
    return hasPlayer ? `<div class="match-player-legends">${players.join('')}</div>` : '阵容待补充';
  }

  function computeStandings(source = appState) {
    const threshold = clampInt(source.event.threshold, 1, 999, 50);
    const stats = new Map();

    source.teams.forEach((team, seed) => {
      stats.set(team.id, {
        team,
        seed,
        total: 0,
        kills: 0,
        placementPoints: 0,
        matchesPlayed: 0,
        wins: 0,
        bestPlacement: 99,
        lastPlacement: null,
        placements: [],
        recent: [],
        matchPoint: false,
        firstEligibleMatch: null,
        pointsToThreshold: threshold
      });
    });

    const matchPointSets = [];
    let champion = null;

    source.matches.forEach((match, matchIndex) => {
      const eligibleBefore = new Set();
      stats.forEach((stat) => {
        if (stat.total >= threshold) eligibleBefore.add(stat.team.id);
      });
      matchPointSets.push(eligibleBefore);

      const results = [...match.results].sort((a, b) => a.placement - b.placement);
      const winner = results.find((result) => result.placement === 1);

      if (!champion && winner && eligibleBefore.has(winner.teamId)) {
        const winnerTeam = getTeamFrom(source, winner.teamId);
        champion = {
          team: winnerTeam,
          teamId: winner.teamId,
          matchId: match.id,
          matchIndex,
          matchNumber: matchIndex + 1,
          map: match.map,
          kills: winner.kills,
          placementPoints: getPlacementPoints(winner.placement)
        };
      }

      results.forEach((result) => {
        const stat = stats.get(result.teamId);
        if (!stat) return;
        const placementPoints = getPlacementPoints(result.placement);
        stat.total += placementPoints + result.kills;
        stat.kills += result.kills;
        stat.placementPoints += placementPoints;
        stat.matchesPlayed += 1;
        stat.placements.push(result.placement);
        stat.recent = stat.placements.slice(-5);
        stat.lastPlacement = result.placement;
        stat.bestPlacement = Math.min(stat.bestPlacement, result.placement);
        if (result.placement === 1) stat.wins += 1;
        if (stat.firstEligibleMatch === null && stat.total >= threshold) {
          stat.firstEligibleMatch = matchIndex + 1;
        }
      });
    });

    const rows = Array.from(stats.values()).map((stat) => ({
      ...stat,
      matchPoint: stat.total >= threshold,
      pointsToThreshold: Math.max(0, threshold - stat.total)
    }));

    rows.sort((a, b) => (
      b.total - a.total
      || b.kills - a.kills
      || a.bestPlacement - b.bestPlacement
      || b.wins - a.wins
      || a.seed - b.seed
    ));
    rows.forEach((row, index) => { row.rank = index + 1; });

    if (champion) {
      const championStat = stats.get(champion.teamId);
      champion.total = championStat.total;
      champion.killsTotal = championStat.kills;
      champion.players = championStat.team.players;
      champion.team = championStat.team;
      champion.match = source.matches[champion.matchIndex];
    }

    return {
      rows,
      champion,
      threshold,
      matchPointSets,
      totalKills: rows.reduce((sum, row) => sum + row.kills, 0),
      eligibleCount: rows.filter((row) => row.matchPoint).length
    };
  }

  function getTeamFrom(source, teamId) {
    return source.teams.find((team) => team.id === teamId) || null;
  }

  function renderHeader(computed) {
    const { champion, threshold } = computed;
    const isFinal = Boolean(champion);
    const hasMatches = appState.matches.length > 0;
    const lastMatch = appState.matches[appState.matches.length - 1];

    els.brandEventName.textContent = appState.event.name;
    els.eventTitle.textContent = appState.event.name;
    els.eventSubtitle.textContent = appState.event.subtitle || EVENT_SUBTITLE;
    els.statMatches.textContent = appState.matches.length;
    els.statThreshold.textContent = threshold;
    els.statTeams.textContent = appState.teams.length;
    els.statMatchPoint.textContent = computed.eligibleCount;

    els.liveDot.classList.toggle('is-final', isFinal);
    if (isFinal) {
      els.statusText.textContent = '赛事已定榜';
      els.matchMeta.textContent = `第 ${champion.matchNumber} 局 · ${champion.map}`;
    } else if (hasMatches) {
      els.statusText.textContent = '比赛进行中';
      els.matchMeta.textContent = lastMatch ? `第 ${appState.matches.length} 局结束 · ${lastMatch.map}` : '比赛进行中';
    } else {
      els.statusText.textContent = '等待开赛';
      els.matchMeta.textContent = '等待第一局';
    }

    els.championStrip.hidden = !champion;
    if (champion) {
      els.championStripName.textContent = champion.team.name;
      els.championStripDetail.textContent = `第 ${champion.matchNumber} 局 · ${champion.map} · 赛点后吃鸡`;
      els.championStripPoints.textContent = champion.total;
    }

    [els.addMatchBtn, els.addMatchBtn2].forEach((button) => {
      if (!button) return;
      button.disabled = isFinal;
      const label = button.querySelector('span');
      if (label) label.textContent = isFinal ? '已定榜' : '录入赛果';
    });
    if (els.legendEntryBtn) els.legendEntryBtn.disabled = isFinal;

    if (els.undoMatchBtn) els.undoMatchBtn.disabled = !hasMatches;

    document.title = appState.event.name;
  }

  function renderStandings(computed) {
    const championId = computed.champion ? computed.champion.teamId : null;

    if (!computed.rows.length) {
      els.standingsColumns.innerHTML = '<div class="standings-empty">暂无队伍，请先前往队伍管理添加。</div>';
      return;
    }

    const midpoint = Math.ceil(computed.rows.length / 2);
    const chunks = computed.rows.length > 1
      ? [computed.rows.slice(0, midpoint), computed.rows.slice(midpoint)]
      : [computed.rows];

    els.standingsColumns.innerHTML = chunks.map((rows, columnIndex) => {
      const rangeStart = rows[0] ? rows[0].rank : 0;
      const rangeEnd = rows[rows.length - 1] ? rows[rows.length - 1].rank : 0;
      return `
        <div class="standings-column">
          <div class="column-caption">
            <span>RANK ${String(rangeStart).padStart(2, '0')} — ${String(rangeEnd).padStart(2, '0')}</span>
          </div>
          <table class="standings-table split-table">
            <thead>
              <tr>
                <th class="col-rank">排名</th>
                <th class="col-team">战队</th>
                <th class="col-players">参赛选手</th>
                <th class="col-kills">击杀</th>
                <th class="col-total">总分</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((row, index) => {
                const isChampion = row.team.id === championId;
                const classes = [
                  `rank-${Math.min(row.rank, 4)}`,
                  isChampion ? 'is-champion' : '',
                  row.matchPoint ? 'is-matchpoint' : ''
                ].filter(Boolean).join(' ');
                const players = playerText(row.team);
                const playerMarkup = players
                  ? `<div class="player-list player-list-vertical">${playerChips(row.team, 'sm')}</div>`
                  : '<span class="empty-roster">阵容待补充</span>';
                const playerTitle = row.team.players
                  .filter((item) => getPlayerName(item))
                  .map((item) => `${getPlayerName(item)}（${rankMeta(item.rank)?.name || '未设置'}）`)
                  .join(' · ');

                return `
                  <tr class="${classes}" style="--row-index:${index + columnIndex * 2}">
                    <td class="split-rank">
                      <div class="rank-cell">
                        <span class="rank-number">${String(row.rank).padStart(2, '0')}</span>
                      </div>
                    </td>
                    <td class="split-team">
                      <div class="team-stack">
                        <span class="team-name" title="${escapeHTML(row.team.name)}">${escapeHTML(row.team.name)}</span>
                        ${row.matchPoint ? '<span class="team-matchpoint">MATCH POINT</span>' : ''}
                      </div>
                    </td>
                    <td class="split-players players-cell" title="${escapeHTML(playerTitle || '阵容待补充')}">${playerMarkup}</td>
                    <td class="split-kills">
                      <span class="split-kills-value ${row.kills === 0 ? 'is-zero' : ''}">${row.kills}</span>
                    </td>
                    <td class="split-total"><span class="total-points">${row.total}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }).join('');
  }

  function syncTimelineAxis() {
    const timeline = els.matchesList.querySelector('.match-timeline');
    if (!timeline) return;
    const axis = timeline.querySelector('.timeline-axis');
    if (!axis) return;
    const dots = timeline.querySelectorAll('.timeline-dot');
    if (dots.length < 2 || !timeline.getClientRects().length) {
      axis.style.display = 'none';
      return;
    }
    const timelineRect = timeline.getBoundingClientRect();
    const firstRect = dots[0].getBoundingClientRect();
    const lastRect = dots[dots.length - 1].getBoundingClientRect();
    const top = firstRect.top + firstRect.height / 2 - timelineRect.top;
    const bottom = lastRect.top + lastRect.height / 2 - timelineRect.top;
    axis.style.display = 'block';
    axis.style.top = `${top}px`;
    axis.style.height = `${Math.max(0, bottom - top)}px`;
  }

  function renderBanOverview() {
    if (!els.banOverview) return;
    if (!appState.matches.length) {
      els.banOverview.hidden = true;
      els.banOverview.innerHTML = '';
      return;
    }

    const timeline = buildLegendBanTimeline();
    els.banOverview.hidden = false;
    const currentHTML = timeline.banned.length
      ? timeline.banned.map((item) => `
          <span class="ban-current-chip">
            <span class="ban-current-art">
              <img src="${escapeHTML(legendThumbSrc(item.legend))}" alt="" loading="lazy" decoding="async" fetchpriority="low" />
              <span class="ban-stamp">BAN</span>
            </span>
            <span class="ban-current-copy">
              <b>${escapeHTML(item.legend.name)}</b>
              <small>第 ${item.origin || '?'} 局 BAN</small>
            </span>
          </span>
        `).join('')
      : '<div class="ban-overview-empty">当前没有 BAN 位</div>';

    const releasesHTML = timeline.releases.length
      ? timeline.releases.map((event) => `
          <div class="ban-release-row">
            <span class="ban-release-match"><b>G${String(event.matchNumber).padStart(2, '0')}</b><small>第 ${event.matchNumber} 局</small></span>
            <span class="ban-release-arts">
              ${event.released.map((legend) => `
                <span class="ban-release-art"><img src="${escapeHTML(legendThumbSrc(legend))}" alt="" loading="lazy" decoding="async" fetchpriority="low" /></span>
              `).join('')}
            </span>
            <span class="ban-release-copy">
              <b>${escapeHTML(event.category)} 阵营解禁</b>
              <small>${event.released.map((legend) => escapeHTML(legend.name)).join(' / ')}</small>
            </span>
            <span class="ban-release-mode">${event.mode}</span>
          </div>
        `).join('')
      : '<div class="ban-overview-empty">还没有触发阵营解禁</div>';

    els.banOverview.innerHTML = `
      <div class="ban-overview-head">
        <div>
          <span class="panel-kicker">BAN TRACKER</span>
          <b>BAN 位详情</b>
        </div>
        <div class="ban-overview-actions">
          <button class="text-btn ban-overview-copy" type="button" data-copy-current-bans title="复制当前 BAN 位" ${timeline.banned.length ? '' : 'disabled'}>复制 BAN 位</button>
          <small>共 <b>${timeline.banned.length}</b> 位</small>
        </div>
      </div>
      <div class="ban-overview-grid">
        <section class="ban-overview-section">
          <div class="ban-overview-section-head"><b>当前 BAN 位</b></div>
          <div class="ban-current-list">${currentHTML}</div>
        </section>
        <section class="ban-overview-section">
          <div class="ban-overview-section-head"><b>解禁记录</b></div>
          <div class="ban-release-list">${releasesHTML}</div>
        </section>
      </div>
    `;
  }

  async function copyCurrentBanList() {
    const timeline = buildLegendBanTimeline();
    if (!timeline.banned.length) {
      showToast('当前没有 BAN 位。', 'warn');
      return;
    }
    const lines = [`当前 BAN 位（${timeline.banned.length}）`];
    timeline.banned.forEach((item, index) => {
      lines.push(`${String(index + 1).padStart(2, '0')}  ${item.legend.name}  第 ${item.origin || '?'} 局 BAN`);
    });
    const ok = await copyText(lines.join('\n'));
    showToast(ok ? '当前 BAN 位已复制。' : '复制失败，请手动选择文字。', ok ? 'success' : 'error');
  }

  function renderMatches(computed) {
    const matches = appState.matches;
    const champion = computed.champion;

    renderBanOverview();

    if (!matches.length) {
      els.matchesList.innerHTML = adminMode ? `
        <div class="empty-panel">
          <div class="empty-panel-icon">G1</div>
          <h3>第一局，从零开始</h3>
          <p>先在赛前分配本局传奇，结束后再录入每队排名与击杀。</p>
          <div class="empty-panel-actions">
            <button class="ghost-btn" type="button" data-action="open-legend">录入第一局传奇</button>
            <button class="primary-btn" type="button" data-action="open-entry">录入第一局赛果</button>
          </div>
        </div>
      ` : `
        <div class="empty-panel">
          <div class="empty-panel-icon">—</div>
          <h3>暂无对局记录</h3>
          <p>当前还没有录入任何对局。</p>
        </div>
      `;
      return;
    }

    els.matchesList.innerHTML = `<div class="match-timeline"><span class="timeline-axis" aria-hidden="true"></span>${matches.slice().reverse().map((match) => {
      const actualIndex = matches.indexOf(match);
      const matchNumber = actualIndex + 1;
      const results = [...match.results].sort((a, b) => a.placement - b.placement);
      const winnerResult = results.find((result) => result.placement === 1);
      const winner = winnerResult ? getTeam(winnerResult.teamId) : null;
      const winnerPoints = winnerResult ? getPlacementPoints(1) + winnerResult.kills : 0;
      const isLatest = actualIndex === matches.length - 1;
      const isChampionMatch = champion && champion.matchId === match.id;
      const stamp = formatTimelineStamp(match.createdAt);
      const legendReport = buildLegendReportFromMatch(match);
      const legendReportHTML = legendReport.rows.length ? `
        <div class="match-legend-report">
          <div class="match-legend-head">
            <div>
              <span>LEGEND PICKS</span>
              <b>本局传奇选取率</b>
              <small>${legendReport.selected}/${legendReport.total} 名选手</small>
            </div>
            <button class="text-btn" type="button" data-copy-legend-report="${escapeHTML(match.id)}">复制统计</button>
          </div>
          <div class="match-legend-preview">
            ${legendReport.rows.slice(0, 3).map((row) => `
              <span class="legend-preview-chip">
                <img src="${escapeHTML(legendThumbSrc(row.legend))}" alt="" loading="lazy" decoding="async" fetchpriority="low" />
                <span><b>${escapeHTML(row.legend.name)}</b><small>${row.count} 次 · ${row.rate.toFixed(1)}%</small></span>
              </span>
            `).join('')}
            ${legendReport.rows.length > 3 ? `
              <button class="legend-preview-more" type="button" data-open-legend-report="${escapeHTML(match.id)}"
                title="查看完整传奇选取率排名" aria-label="查看完整传奇选取率排名">
                +${legendReport.rows.length - 3}
              </button>
            ` : ''}
          </div>
        </div>
      ` : '';

      return `
        <div class="timeline-item ${isLatest ? 'is-latest' : ''}">
          <time class="timeline-time" datetime="${stamp.iso}" title="${escapeHTML(stamp.full)}">
            <b>${stamp.time}</b>
            <span>${stamp.date}</span>
          </time>
          <span class="timeline-dot" aria-hidden="true"></span>
          <span class="timeline-connector" aria-hidden="true"></span>
          <details class="match-card ${isChampionMatch ? 'is-champion-match' : ''}" ${isLatest ? 'open' : ''}>
            <summary>
              <div class="match-number">
                <b>G${String(matchNumber).padStart(2, '0')}</b>
                <span>${escapeHTML(match.map)}</span>
              </div>
              <div class="match-summary-main">
                <div class="match-winner-name">
                  <small>${isChampionMatch ? '冠军诞生' : 'WINNER'}</small>
                  <b>${winner ? escapeHTML(winner.name) : '—'}</b>
                </div>
              </div>
              <div class="match-summary-tags">
                ${isChampionMatch ? '<span class="tag gold">赛点吃鸡</span>' : ''}
                <span class="tag">${winnerResult ? winnerResult.kills : 0} 击杀</span>
                <span class="tag gold">+${winnerPoints} 分</span>
                ${ICONS.chevron}
              </div>
            </summary>
            <div class="match-detail">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>战队</th>
                    <th>参赛选手</th>
                    <th>击杀</th>
                    <th>排名分</th>
                    <th>本局积分</th>
                  </tr>
                </thead>
                <tbody>
                  ${results.map((result) => {
                    const team = getTeam(result.teamId);
                    if (!team) return '';
                    const points = getPlacementPoints(result.placement) + result.kills;
                    return `
                      <tr>
                        <td><span class="history-rank ${result.placement <= 3 ? 'r' + result.placement : ''}">${result.placement}</span></td>
                        <td><div class="history-team"><b>${escapeHTML(team.name)}</b></div></td>
                        <td class="history-players">${matchPlayersHTML(team, result)}</td>
                        <td class="history-kills">${result.kills}</td>
                        <td>${getPlacementPoints(result.placement)}</td>
                        <td class="history-points">+${points}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
              <div class="history-footer">
                <span>${escapeHTML(match.map)} · 共 ${results.length} 支队伍</span>
                <span>单局总击杀 ${results.reduce((sum, result) => sum + result.kills, 0)}</span>
              </div>
              ${legendReportHTML}
            </div>
          </details>
        </div>
      `;
    }).join('')}</div>`;
    window.requestAnimationFrame(syncTimelineAxis);
  }

  function teamCardCode(team, index) {
    const teamNumber = String(team.name || '').match(/^TEAM\s*[-_]?\s*(\d+)/i);
    if (teamNumber) return `T${teamNumber[1]}`;
    return `T${index + 1}`;
  }

  function renderTeams(computed) {
    const playerCount = appState.teams.reduce((sum, team) => sum + teamPlayerCount(team), 0);
    const isFinal = Boolean(computed.champion);

    els.rosterSummary.innerHTML = `<b>${appState.teams.length}</b> 支队伍 · <b>${playerCount}</b> 名选手`;
    els.addTeamBtn.disabled = isFinal || appState.teams.length >= MAX_TEAMS;
    els.addTeamBtn.title = isFinal ? '赛事已定榜，如需调整名单请先撤销冠军对局' : '';

    els.teamGrid.innerHTML = appState.teams.map((team, teamIndex) => {
      const players = Array.from({ length: 3 }, (_, index) => {
        const item = team.players[index] || { name: '', rank: '' };
        const playerName = getPlayerName(item);
        return `
          <div class="roster-player ${playerName ? '' : 'empty'}">
            ${rankBadge(item, 'lg')}
            <span class="roster-player-name">${playerName ? escapeHTML(playerName) : '待定'}</span>
          </div>
        `;
      }).join('');

      return `
        <article class="team-card${team.restricted ? ' is-restricted' : ''}" style="--team-accent:${teamAccentColor(team)}">
          <span class="team-card-watermark" aria-hidden="true">${escapeHTML(teamCardCode(team, teamIndex))}</span>
          <div class="team-card-main">
            <div class="team-card-identity">
              <div class="team-card-title-row">
                <h3 title="${escapeHTML(team.name)}">${escapeHTML(team.name)}</h3>
                ${team.restricted ? `
                  <span class="team-limit-tag" title="选手实力过强，参赛受额外限制">
                    <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="8" width="10" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7.2 8V6.2a2.8 2.8 0 0 1 5.6 0V8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    能力限制
                  </span>
                ` : ''}
              </div>
            </div>
            <div class="team-actions">
              <button class="mini-btn" type="button" title="编辑队伍" aria-label="编辑 ${escapeHTML(team.name)}" data-action="edit-team" data-team-id="${escapeHTML(team.id)}">${ICONS.edit}</button>
              <button class="mini-btn danger" type="button" title="删除队伍" aria-label="删除 ${escapeHTML(team.name)}" data-action="delete-team" data-team-id="${escapeHTML(team.id)}">${ICONS.trash}</button>
            </div>
          </div>
          <div class="team-card-players">${players}</div>
        </article>
      `;
    }).join('');
  }

  function renderSettings() {
    if (document.activeElement !== els.settingName) els.settingName.value = appState.event.name;
    if (document.activeElement !== els.settingSubtitle) els.settingSubtitle.value = appState.event.subtitle;
    if (document.activeElement !== els.settingThreshold) els.settingThreshold.value = appState.event.threshold;
    els.settingBanModes.forEach((input) => {
      input.checked = input.value === (appState.event.banReleaseMode === 'earliest' ? 'earliest' : 'all');
    });
    els.settingLegendCopyLimit.value = ['3', '5', 'all'].includes(appState.event.legendCopyLimit)
      ? appState.event.legendCopyLimit
      : '5';
    els.settingBackgroundStyle.value = appState.event.backgroundStyle === 'classic' ? 'classic' : 'prism';

    const locked = appState.matches.length > 0;
    els.settingThreshold.disabled = locked;
    els.settingsNote.textContent = locked
      ? '赛点线在首局后不可修改。'
      : '设置会同步到 Netlify 云端。';
    els.clearMatchesBtn.disabled = !locked;
    renderCloudSettings();
  }

  function openRulesGuide() {
    els.rulesGuideEventName.textContent = appState.event.name;
    els.rulesGuideThreshold.textContent = appState.event.threshold;
    if (!els.rulesGuideDialog.open) els.rulesGuideDialog.showModal();
  }

  function applyBackgroundStyle() {
    document.body.classList.toggle('bg-refresh', appState.event.backgroundStyle !== 'classic');
  }

  function renderAll(options = {}) {
    applyBackgroundStyle();
    const computed = computeStandings();
    renderHeader(computed);
    renderStandings(computed);
    renderMatches(computed);
    renderTeams(computed);
    renderSettings();
    if (options.applyView !== false) applyView();
  }

  /* ------------------------------ routing ------------------------------ */
  const VALID_VIEWS = new Set(['standings', 'matches', 'teams', 'settings']);

  function currentView() {
    const hash = window.location.hash.replace('#', '');
    return VALID_VIEWS.has(hash) ? hash : 'standings';
  }

  function applyView() {
    let view = currentView();
    if (!adminMode && view === 'settings') {
      window.history.replaceState(null, '', '#standings');
      view = 'standings';
    }
    $$('.view').forEach((section) => {
      section.classList.toggle('active', section.dataset.view === view);
    });
    $$('[data-nav]').forEach((link) => {
      link.classList.toggle('active', link.dataset.nav === view);
    });
    document.title = appState.event.name;
    if (view === 'matches') window.requestAnimationFrame(syncTimelineAxis);
  }

  function navigate(view) {
    if (!VALID_VIEWS.has(view)) view = 'standings';
    if (!adminMode && view === 'settings') view = 'standings';
    if (window.location.hash === `#${view}`) {
      applyView();
    } else {
      window.location.hash = view;
    }
  }

  /* ------------------------------ admin auth ------------------------------ */
  function readAdminSession() {
    try {
      return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  }

  function applyAuthUI() {
    document.body.classList.toggle('is-readonly', !adminMode);
    [els.legendEntryBtn, els.addMatchBtn, els.addMatchBtn2, els.undoMatchBtn, els.addTeamBtn]
      .forEach((button) => {
        if (button) button.hidden = !adminMode;
      });
    $$('.main-nav [data-nav="settings"]').forEach((link) => {
      link.hidden = !adminMode;
    });

    if (!adminMode) {
      const view = currentView();
      if (view === 'settings') {
        window.history.replaceState(null, '', '#standings');
      }
    }
  }

  function ensureAdmin() {
    if (adminMode) return true;
    showToast('当前为只读模式，无法修改赛事数据。', 'warn', 3600);
    return false;
  }

  function currentAdminPassword() {
    const now = new Date();
    return `Naana${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  }

  function openAuthDialog() {
    if (adminMode || !els.authDialog) return;
    els.authPassword.value = '';
    els.authError.hidden = true;
    if (!els.authDialog.open) els.authDialog.showModal();
    window.setTimeout(() => els.authPassword.focus(), 60);
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (els.authPassword.value.trim() !== currentAdminPassword()) {
      els.authError.hidden = false;
      els.authPassword.select();
      return;
    }

    adminMode = true;
    try {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    } catch {
      // Session storage is optional; the in-memory mode still works.
    }
    els.authDialog.close();
    applyAuthUI();
    renderAll({ applyView: false });
    applyView();
    showToast('已进入管理模式。', 'success');
  }

  let brandClickCount = 0;
  let brandClickTimer = 0;

  function handleBrandClick(event) {
    if (adminMode || event.target.closest('a[href]') !== els.brand) return;
    brandClickCount += 1;
    window.clearTimeout(brandClickTimer);
    if (brandClickCount >= 3) {
      brandClickCount = 0;
      event.preventDefault();
      openAuthDialog();
      return;
    }
    brandClickTimer = window.setTimeout(() => {
      brandClickCount = 0;
    }, 750);
  }

  /* ------------------------------ toast ------------------------------ */
  function showToast(message, type = 'success', duration = 3400) {
    if (!els.toastStack) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type || ''}`.trim();
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    const copy = document.createElement('span');
    copy.textContent = message;
    toast.append(icon, copy);
    els.toastStack.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add('out');
      window.setTimeout(() => toast.remove(), 260);
    }, duration);
  }

  /* ------------------------------ confirm ------------------------------ */
  function askConfirm({
    title = '确认操作',
    message = '',
    okText = '确认',
    cancelText = '取消',
    danger = true
  } = {}) {
    return new Promise((resolve) => {
      if (confirmResolver) confirmResolver(false);
      els.confirmTitle.textContent = title;
      els.confirmMessage.textContent = message;
      els.confirmOkBtn.textContent = okText;
      $('.ghost-btn', els.confirmDialog).textContent = cancelText;
      els.confirmOkBtn.classList.toggle('danger-btn', danger);
      confirmResolver = (value) => {
        confirmResolver = null;
        if (els.confirmDialog.open) els.confirmDialog.close();
        resolve(Boolean(value));
      };
      els.confirmDialog.showModal();
      window.setTimeout(() => els.confirmOkBtn.focus(), 30);
    });
  }

  /* ------------------------------ legend draft ------------------------------ */
  function getEditorTeamOrder() {
    const ordered = computeStandings().rows
      .map((row) => row.team.id)
      .filter((teamId) => Boolean(getTeam(teamId)));
    const rest = appState.teams
      .map((team) => team.id)
      .filter((teamId) => !ordered.includes(teamId));
    return [...ordered, ...rest];
  }

  function getEditorPicks(teamId) {
    return normalizeLegendPicks(legendDraftEditor ? legendDraftEditor[teamId] : []);
  }

  function setEditorPick(teamId, playerIndex, legendId) {
    if (!legendDraftEditor) return;
    const picks = getEditorPicks(teamId);
    picks[playerIndex] = LEGEND_IDS.has(legendId) ? legendId : null;
    legendDraftEditor[teamId] = picks;
  }

  function getEditorCompletion() {
    let required = 0;
    let selected = 0;
    getEditorTeamOrder().forEach((teamId) => {
      const team = getTeam(teamId);
      if (!team) return;
      const picks = getEditorPicks(teamId);
      team.players.forEach((player, index) => {
        if (!getPlayerName(player)) return;
        required += 1;
        if (getLegendById(picks[index])) selected += 1;
      });
    });
    return { required, selected, missing: required - selected, complete: required === selected };
  }

  function renderLegendEditor() {
    if (!legendDraftEditor) return;
    const teamIds = getEditorTeamOrder();
    const completion = getEditorCompletion();
    const report = buildLegendReportFromPicks(legendDraftEditor, teamIds);

    els.legendDialogCompletion.textContent = `${completion.selected} / ${completion.required}`;
    els.legendDialogCompletion.classList.toggle('is-complete', completion.complete && completion.required > 0);

    els.legendTeams.innerHTML = teamIds.map((teamId) => {
      const team = getTeam(teamId);
      if (!team) return '';
      const picks = getEditorPicks(teamId);
      let teamRequired = 0;
      let teamSelected = 0;
      const slots = team.players.map((player, playerIndex) => {
        const playerName = getPlayerName(player);
        if (!playerName) {
          return `
            <div class="legend-player-slot is-empty">
              <span class="legend-slot-art"><span class="legend-slot-placeholder">—</span></span>
              <span class="legend-slot-copy"><b>空位</b><small>无选手</small></span>
            </div>
          `;
        }
        teamRequired += 1;
        const legend = getLegendById(picks[playerIndex]);
        if (legend) teamSelected += 1;
        return `
          <button class="legend-player-slot${legend ? ' has-legend' : ''}" type="button"
            data-legend-team="${escapeHTML(teamId)}" data-legend-player="${playerIndex}"
            title="为 ${escapeHTML(playerName)} 选择传奇">
            <span class="legend-slot-art">
              ${legend
                ? `<img src="${escapeHTML(legendThumbSrc(legend))}" alt="" loading="lazy" decoding="async" fetchpriority="low" />`
                : '<span class="legend-slot-placeholder">+</span>'}
            </span>
            <span class="legend-slot-copy">
              <b>${escapeHTML(playerName)}</b>
              <small>${legend ? escapeHTML(legend.name) : '选择传奇'}</small>
            </span>
          </button>
        `;
      }).join('');

      return `
        <article class="legend-team-card" style="--team-accent:${teamAccentColor(team)}">
          <header class="legend-team-head">
            <span class="legend-team-dot"></span>
            <b>${escapeHTML(team.name)}</b>
            <small>${teamSelected}/${teamRequired}</small>
          </header>
          <div class="legend-player-slots">${slots}</div>
        </article>
      `;
    }).join('');

    els.legendRateSummary.textContent = `${report.selected} / ${report.total} 名选手已选`;
    els.legendRateList.innerHTML = legendRateRowsHTML(report);
    els.legendRateList.hidden = report.rows.length === 0;
    els.legendRateEmpty.hidden = report.rows.length > 0;
    els.legendCopyBtn.disabled = report.selected === 0;
    els.legendFootHint.textContent = completion.complete && completion.required > 0
      ? '本局传奇已全部选择，可保存'
      : `还有 ${completion.missing} 位选手未选择传奇，可先保存部分`;
    els.legendSaveBtn.textContent = '保存传奇';
  }

  function openLegendEditor() {
    if (!ensureAdmin()) return;
    if (computeStandings().champion) {
      showToast('赛事已经定榜，如需修改传奇请先撤销冠军对局。', 'warn', 4200);
      return;
    }
    preloadLegendCards();
    if (!appState.teams.length) {
      showToast('还没有队伍，请先在参赛队伍中建立名单。', 'error');
      navigate('teams');
      return;
    }

    const sourcePicks = appState.legendDraft && appState.legendDraft.picks
      ? appState.legendDraft.picks
      : {};
    legendDraftEditor = {};
    appState.teams.forEach((team) => {
      legendDraftEditor[team.id] = normalizeLegendPicks(sourcePicks[team.id]);
    });

    els.legendDialogTitle.textContent = `第 ${appState.matches.length + 1} 局 · 分配传奇`;
    renderLegendEditor();
    els.legendDialog.showModal();
    window.setTimeout(() => {
      const firstSlot = $('.legend-player-slot:not(.is-empty)', els.legendTeams);
      if (firstSlot) firstSlot.focus({ preventScroll: true });
    }, 80);
  }

  function closeLegendEditor() {
    legendDraftEditor = null;
    if (els.legendPickerDialog.open) els.legendPickerDialog.close();
    if (els.legendDialog.open) els.legendDialog.close();
  }

  function saveLegendEditor() {
    if (!ensureAdmin()) return;
    if (!legendDraftEditor) return;
    const picks = {};
    let hasPick = false;
    appState.teams.forEach((team) => {
      const teamPicks = getEditorPicks(team.id);
      picks[team.id] = teamPicks;
      if (teamPicks.some(Boolean)) hasPick = true;
    });

    const now = new Date().toISOString();
    appState.legendDraft = hasPick
      ? {
          picks,
          createdAt: (appState.legendDraft && appState.legendDraft.createdAt) || now,
          updatedAt: now
        }
      : null;
    saveState();

    const completion = getLegendCompletion();
    legendDraftEditor = null;
    els.legendDialog.close();
    if (els.entryDialog.open) {
      renderEntryRows();
      updateEntryTotals();
    }
    if (completion.required === 0) {
      showToast('本局没有需要选择传奇的选手。', 'warn');
    } else if (completion.complete) {
      showToast(`本局传奇已保存 · ${completion.selected}/${completion.required}`, 'success');
    } else {
      showToast(`传奇已保存 · 还差 ${completion.missing.length} 位选手`, 'warn', 3600);
    }
  }

  function buildLegendPicker() {
    if (legendPickerBuilt || !els.legendPickerGrid) return;
    els.legendPickerGrid.innerHTML = LEGENDS.map((legend) => `
      <button class="legend-choice" type="button" data-legend-choice="${escapeHTML(legend.id)}">
        <span class="legend-choice-art"><img src="${escapeHTML(legendCardSrc(legend))}" alt="" loading="eager" decoding="async" /></span>
        <span class="legend-choice-copy">
          <b>${escapeHTML(legend.name)}</b>
          <small>${escapeHTML(legend.category)}</small>
        </span>
      </button>
    `).join('') + '<div class="legend-picker-empty" hidden>没有找到匹配的传奇</div>';
    legendPickerBuilt = true;
  }

  function renderLegendPicker() {
    if (!els.legendPickerGrid) return;
    buildLegendPicker();
    const query = els.legendPickerSearch.value.trim().toLowerCase();
    const current = legendPickerTarget
      ? getEditorPicks(legendPickerTarget.teamId)[legendPickerTarget.playerIndex]
      : null;
    let visible = 0;

    els.legendPickerGrid.querySelectorAll('[data-legend-choice]').forEach((button) => {
      const legend = getLegendById(button.dataset.legendChoice);
      if (!legend) return;
      const matches = !query
        || legend.name.toLowerCase().includes(query)
        || legend.id.toLowerCase().includes(query)
        || legend.category.toLowerCase().includes(query);
      button.hidden = !matches;
      if (matches) visible += 1;
      button.classList.toggle('is-selected', legend.id === current);
    });

    const empty = els.legendPickerGrid.querySelector('.legend-picker-empty');
    if (empty) empty.hidden = visible > 0;
  }

  function openLegendPicker(teamId, playerIndex) {
    const team = getTeam(teamId);
    const playerName = team ? getPlayerName(team.players[playerIndex]) : '';
    if (!team || !playerName || !legendDraftEditor) return;
    preloadLegendCards();
    legendPickerTarget = { teamId, playerIndex };
    els.legendPickerTitle.textContent = `为 ${playerName} 选择传奇`;
    els.legendPickerSearch.value = '';
    renderLegendPicker();
    els.legendPickerDialog.showModal();
    window.setTimeout(() => els.legendPickerSearch.focus(), 60);
  }

  function chooseLegend(legendId) {
    if (!legendPickerTarget || !legendDraftEditor) return;
    setEditorPick(legendPickerTarget.teamId, legendPickerTarget.playerIndex, legendId);
    legendPickerTarget = null;
    els.legendPickerDialog.close();
    renderLegendEditor();
  }

  async function copyLegendDraftReport() {
    if (!legendDraftEditor) return;
    const report = buildLegendReportFromPicks(legendDraftEditor, getEditorTeamOrder());
    if (!report.selected) {
      showToast('还没有选择任何传奇。', 'warn');
      return;
    }
    const title = `第 ${appState.matches.length + 1} 局 传奇选取率（赛前）`;
    const banInfo = getLegendBanInfoForDraft(report);
    const ok = await copyText(legendReportText(report, title, banInfo));
    showToast(ok ? '传奇选取率统计已复制。' : '复制失败，请手动选择文字。', ok ? 'success' : 'error');
  }

  async function copyMatchLegendReport(matchId) {
    const matchIndex = appState.matches.findIndex((match) => match.id === matchId);
    const match = appState.matches[matchIndex];
    if (!match) return;
    const report = buildLegendReportFromMatch(match);
    if (!report.rows.length) {
      showToast('本局还没有传奇选择记录。', 'warn');
      return;
    }
    const title = `第 ${matchIndex + 1} 局（${match.map}）传奇选取率`;
    const banInfo = getLegendBanInfoForMatch(matchId);
    const ok = await copyText(legendReportText(report, title, banInfo));
    showToast(ok ? '本局传奇选取率统计已复制。' : '复制失败，请手动选择文字。', ok ? 'success' : 'error');
  }

  function openLegendReport(matchId) {
    const matchIndex = appState.matches.findIndex((match) => match.id === matchId);
    const match = appState.matches[matchIndex];
    if (!match) return;
    const report = buildLegendReportFromMatch(match);
    if (!report.rows.length) {
      showToast('本局还没有传奇选择记录。', 'warn');
      return;
    }
    legendReportMatchId = matchId;
    els.legendReportTitle.textContent = `第 ${matchIndex + 1} 局 · 传奇选取率`;
    els.legendReportMeta.textContent = `${match.map} · ${report.selected}/${report.total} 名选手 · ${report.rows.length} 种传奇`;
    const banInfo = getLegendBanInfoForMatch(matchId);
    const cumulativeBans = banInfo.cumulative.map((legend) => legend.name).join(' / ');
    const releasedNames = banInfo.released.map((legend) => legend.name).join(' / ');
    const releaseModeLabel = appState.event.banReleaseMode === 'earliest' ? '最早解禁' : '全员解禁';
    els.legendReportBan.innerHTML = `
      <span class="ban-current-label">本局 BAN</span>
      <b>${banInfo.current ? escapeHTML(banInfo.current.name) : '无新增'}</b>
      ${cumulativeBans ? `<span class="ban-history-label">累计</span><span class="ban-history-names">${escapeHTML(cumulativeBans)}</span>` : ''}
      ${releasedNames ? `<span class="ban-release-label">解禁</span><span class="ban-release-names">${escapeHTML(banInfo.releaseCategory)} · ${escapeHTML(releasedNames)}（${releaseModeLabel}）</span>` : ''}
    `;
    els.legendReportList.innerHTML = `<div class="legend-report-grid">${legendRateRowsHTML(report)}</div>`;
    els.legendReportCopyBtn.disabled = false;
    els.legendReportDialog.showModal();
  }

  /* ------------------------------ entry ------------------------------ */
  function openEntry() {
    if (!ensureAdmin()) return;
    if (computeStandings().champion) {
      showToast('赛事已经定榜。如需修改，请先在「对局记录」撤销冠军对局。', 'warn', 4200);
      return;
    }
    if (!appState.teams.length) {
      showToast('还没有队伍，请先在参赛队伍中添加队伍。', 'error');
      navigate('teams');
      return;
    }

    const computed = computeStandings();
    const pool = computed.rows.map((row) => row.team.id);
    entryDraft = {
      order: [],
      pool,
      kills: Object.fromEntries(appState.teams.map((team) => [team.id, 0])),
      map: appState.matches.length
        ? (appState.matches[appState.matches.length - 1].map || MAPS[0])
        : MAPS[0]
    };
    els.entryDialogTitle.textContent = `录入第 ${appState.matches.length + 1} 局赛果`;
    els.entryMap.value = MAPS.includes(entryDraft.map) ? entryDraft.map : MAPS[0];
    els.entryEndDrop.classList.remove('is-visible', 'is-over');
    renderEntryWorkspace();
    els.entryDialog.showModal();
    const legendCompletion = getLegendCompletion();
    if (legendCompletion.required > 0 && !legendCompletion.complete) {
      showToast(`本局传奇还差 ${legendCompletion.missing.length} 位选手，保存赛果前需要补全。`, 'warn', 4200);
    }
    window.setTimeout(() => {
      const firstCard = $('.pool-card', els.entryPool);
      if (firstCard) firstCard.focus({ preventScroll: true });
    }, 80);
  }

  function renderEntryWorkspace() {
    if (!entryDraft) return;
    renderEntryRows();
    renderEntryPool();
    updateEntryTotals();
  }

  function entryRosterHTML(team) {
    const picks = getTeamLegendPicks(team.id);
    const players = team.players.map((player, index) => {
      const name = getPlayerName(player);
      if (!name) return '';
      const legend = getLegendById(picks[index]);
      return `
        <span class="entry-roster-player">
          <span>${escapeHTML(name)}</span>
          <span class="entry-roster-legend${legend ? ' has-legend' : ''}" title="${legend ? escapeHTML(legend.name) : '未选择传奇'}">
            ${legend ? `<img src="${escapeHTML(legendThumbSrc(legend))}" alt="" loading="lazy" decoding="async" fetchpriority="low" />` : '?'}
          </span>
        </span>
      `;
    }).filter(Boolean);
    return players.length ? players.join('<i class="entry-roster-sep">·</i>') : '阵容待补充';
  }

  function renderEntryRows() {
    if (!entryDraft) return;
    if (!entryDraft.order.length) {
      els.entryList.innerHTML = `
        <div class="entry-empty-drop" data-entry-empty>
          <span>从下方队伍池拖入战队</span>
          <small>按第 1 名到第 ${entryDraft.pool.length + entryDraft.order.length} 名依次放置</small>
        </div>
      `;
      return;
    }

    els.entryList.innerHTML = entryDraft.order.map((teamId, index) => {
      const team = getTeam(teamId);
      if (!team) return '';
      const placement = index + 1;
      const kills = entryDraft.kills[teamId] || 0;
      const placementPoints = getPlacementPoints(placement);
      const points = placementPoints + kills;
      const roster = entryRosterHTML(team);

      return `
        <div class="entry-row" data-team-id="${escapeHTML(team.id)}" draggable="true">
          <span class="drag-handle" title="拖动整行排序" aria-label="拖动整行排序">⠿</span>
          <span class="entry-rank">${String(placement).padStart(2, '0')}</span>
          <div class="entry-team">
            <div class="entry-team-copy">
              <b>${escapeHTML(team.name)}</b>
              <span class="entry-team-roster">${roster}</span>
            </div>
            <button class="entry-return-btn" type="button" data-entry-action="return" title="移回队伍池" aria-label="将 ${escapeHTML(team.name)} 移回队伍池">×</button>
          </div>
          <div class="kill-control">
            <button class="kill-btn" type="button" data-entry-action="kill-down" aria-label="减少击杀">−</button>
            <input class="kill-input" type="text" inputmode="numeric" pattern="[0-9]*" value="${kills}" aria-label="${escapeHTML(team.name)} 击杀数" />
            <button class="kill-btn" type="button" data-entry-action="kill-up" aria-label="增加击杀">+</button>
          </div>
          <span class="entry-placement" data-placement-for="${escapeHTML(team.id)}"><small>+</small>${placementPoints}</span>
          <span class="entry-points" data-points-for="${escapeHTML(team.id)}"><small>+</small>${points}</span>
        </div>
      `;
    }).join('');
  }

  function renderEntryPool() {
    if (!entryDraft) return;
    const hasPool = entryDraft.pool.length > 0;
    const section = els.entryPool.closest('.entry-pool-section');
    if (section) section.hidden = !hasPool;
    els.entryEndDrop.hidden = !hasPool;

    if (!hasPool) {
      els.entryPool.innerHTML = '';
      return;
    }

    const total = entryDraft.order.length + entryDraft.pool.length;
    const columns = Math.max(1, Math.ceil(total / 2));
    els.entryPool.style.setProperty('--pool-cols', String(columns));
    const currentRanks = new Map(computeStandings().rows.map((row) => [row.team.id, row.rank]));
    els.entryPool.innerHTML = entryDraft.pool.map((teamId) => {
      const team = getTeam(teamId);
      if (!team) return '';
      const players = playerChips(team, 'xs');
      const rank = currentRanks.get(team.id);
      return `
        <article class="pool-card" draggable="true" tabindex="0" data-pool-team-id="${escapeHTML(team.id)}" style="--team-accent:${teamAccentColor(team)}">
          <div class="pool-card-head">
            <b>${escapeHTML(team.name)}</b>
            ${rank ? `<span>#${String(rank).padStart(2, '0')}</span>` : ''}
          </div>
          <div class="pool-card-players">${players || '<span class="team-subline">阵容待补充</span>'}</div>
        </article>
      `;
    }).join('');
  }

  function updateEntryTotals() {
    if (!entryDraft) return;
    const killTotal = Object.values(entryDraft.kills).reduce((sum, value) => sum + (value || 0), 0);
    const totalTeams = entryDraft.order.length + entryDraft.pool.length;
    els.entryKillTotal.textContent = killTotal;
    els.entryPlacedTotal.textContent = entryDraft.order.length;
    els.entryTeamTotal.textContent = totalTeams;
    els.entryPoolCount.textContent = entryDraft.pool.length;

    const hasUnplaced = entryDraft.pool.length > 0;
    const legendCompletion = getLegendCompletion();
    const orderLegendCompletion = getLegendCompletion(entryDraft.order);
    const missingLegends = orderLegendCompletion.required > 0 && !orderLegendCompletion.complete;

    els.entryLegendStatus.textContent = `传奇 ${legendCompletion.selected}/${legendCompletion.required}`;
    els.entryLegendBtn.classList.toggle('is-complete', legendCompletion.complete && legendCompletion.required > 0);
    els.entryLegendBtn.classList.toggle('is-missing', legendCompletion.missing.length > 0);
    els.entryLegendBtn.title = legendCompletion.missing.length > 0
      ? `还有 ${legendCompletion.missing.length} 位选手未选择传奇，点击补录`
      : '本局传奇已全部选择，点击查看';

    els.entrySaveBtn.disabled = hasUnplaced || entryDraft.order.length === 0 || missingLegends;
    els.entrySaveBtn.title = hasUnplaced
      ? `还有 ${entryDraft.pool.length} 支队伍未放入排名`
      : missingLegends
        ? `还有 ${orderLegendCompletion.missing.length} 位选手未选择传奇`
        : '保存本局赛果并计入总积分榜';
    els.entrySortBtn.disabled = false;

    entryDraft.order.forEach((teamId, index) => {
      const placementPoints = getPlacementPoints(index + 1);
      const placementEl = els.entryList.querySelector(`[data-placement-for="${CSS.escape(teamId)}"]`);
      if (placementEl) placementEl.innerHTML = `<small>+</small>${placementPoints}`;
      const pointsEl = els.entryList.querySelector(`[data-points-for="${CSS.escape(teamId)}"]`);
      if (!pointsEl) return;
      const points = placementPoints + (entryDraft.kills[teamId] || 0);
      pointsEl.innerHTML = `<small>+</small>${points}`;
    });
  }

  function clearEntryDropIndicator() {
    if (!els.entryList) return;
    $$('.entry-row.drop-before, .entry-row.drop-after', els.entryList).forEach((row) => {
      row.classList.remove('drop-before', 'drop-after');
    });
    $('.entry-empty-drop.is-over', els.entryList)?.classList.remove('is-over');
    els.entryEndDrop?.classList.remove('is-over');
  }

  function getEntryDropInfo(event) {
    const rows = $$('.entry-row', els.entryList).filter((row) => (
      !(entryDragSource === 'board' && row.dataset.teamId === draggedTeamId)
    ));
    if (!rows.length) {
      return { index: 0, target: null, after: false };
    }

    let index = rows.length;
    let target = null;
    let after = false;
    for (let i = 0; i < rows.length; i += 1) {
      const rect = rows[i].getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        index = i;
        target = rows[i];
        after = false;
        break;
      }
      if (event.clientY <= rect.bottom) {
        index = i + 1;
        target = rows[i];
        after = true;
        break;
      }
    }

    if (!target) {
      target = rows[rows.length - 1];
      after = true;
    }
    return { index, target, after };
  }

  function showEntryDropIndicator(info) {
    clearEntryDropIndicator();
    if (info.target) {
      info.target.classList.add(info.after ? 'drop-after' : 'drop-before');
    } else {
      $('.entry-empty-drop', els.entryList)?.classList.add('is-over');
    }
  }

  function resetEntryDrag() {
    draggedTeamId = null;
    entryDragSource = null;
    entryDragSuppressed = false;
    els.entryEndDrop?.classList.remove('is-visible', 'is-over');
    clearEntryDropIndicator();
    $$('.entry-row.dragging', els.entryList).forEach((row) => row.classList.remove('dragging'));
    $$('.pool-card.dragging', els.entryPool).forEach((card) => card.classList.remove('dragging'));
  }

  function dropEntryAtEnd() {
    if (!draggedTeamId || !entryDraft) return;
    const source = entryDragSource;
    const nextOrder = source === 'board'
      ? entryDraft.order.filter((id) => id !== draggedTeamId)
      : entryDraft.order.slice();
    nextOrder.push(draggedTeamId);
    if (source === 'pool') {
      entryDraft.pool = entryDraft.pool.filter((id) => id !== draggedTeamId);
      entryDraft.kills[draggedTeamId] = 0;
    }
    entryDraft.order = nextOrder;
    resetEntryDrag();
    renderEntryWorkspace();
  }

  function sortEntryPool() {
    if (!entryDraft) return;
    const currentRanks = new Map(computeStandings().rows.map((row) => [row.team.id, row.rank]));
    entryDraft.pool.sort((a, b) => (currentRanks.get(a) || 999) - (currentRanks.get(b) || 999));
  }

  function returnEntryToPool(teamId) {
    if (!entryDraft) return;
    const index = entryDraft.order.indexOf(teamId);
    if (index < 0) return;
    entryDraft.order.splice(index, 1);
    entryDraft.kills[teamId] = 0;
    entryDraft.pool.push(teamId);
    sortEntryPool();
    renderEntryWorkspace();
  }

  function changeKills(teamId, delta) {
    if (!entryDraft) return;
    const current = entryDraft.kills[teamId] || 0;
    entryDraft.kills[teamId] = clampInt(current + delta, 0, MAX_KILLS, 0);
    const row = els.entryList.querySelector(`[data-team-id="${CSS.escape(teamId)}"]`);
    if (row) {
      const input = $('.kill-input', row);
      if (input) input.value = entryDraft.kills[teamId];
    }
    updateEntryTotals();
  }

  function saveEntry() {
    if (!ensureAdmin()) return;
    if (!entryDraft) return;
    if (entryDraft.pool.length) {
      showToast(`还有 ${entryDraft.pool.length} 支队伍未放入排名。`, 'warn', 3600);
      return;
    }
    if (!entryDraft.order.length) {
      showToast('没有可录入的队伍。', 'error');
      return;
    }

    const legendCompletion = getLegendCompletion(entryDraft.order);
    if (legendCompletion.required > 0 && !legendCompletion.complete) {
      showToast(`还有 ${legendCompletion.missing.length} 位选手未选择传奇，请先补录。`, 'warn', 4200);
      openLegendEditor();
      return;
    }

    const before = computeStandings();
    const results = entryDraft.order.map((teamId, index) => ({
      teamId,
      placement: index + 1,
      kills: clampInt(entryDraft.kills[teamId], 0, MAX_KILLS, 0),
      legends: getTeamLegendPicks(teamId)
    }));
    const match = {
      id: uid('match'),
      map: entryDraft.map || MAPS[0],
      createdAt: new Date().toISOString(),
      results
    };
    const next = deepClone(appState);
    next.matches.push(match);
    next.legendDraft = null;
    const after = computeStandings(next);

    appState = next;
    saveState();
    els.entryDialog.close();
    entryDraft = null;
    renderAll();
    navigate('standings');

    if (after.champion && after.champion.matchId === match.id) {
      window.setTimeout(() => openChampionDialog(after.champion), 180);
      return;
    }

    const winnerResult = results.find((result) => result.placement === 1);
    const winner = getTeam(winnerResult.teamId);
    const newlyEligible = after.rows.filter((row) => (
      row.matchPoint && !before.rows.find((oldRow) => oldRow.team.id === row.team.id)?.matchPoint
    ));

    let message = `第 ${appState.matches.length} 局已保存 · ${winner ? winner.name : '胜者'} 吃鸡`;
    if (newlyEligible.length) {
      const names = newlyEligible.map((row) => row.team.name).join('、');
      message += ` · ${names} 达到赛点线`;
    }
    if (match.results.some((result) => result.legends.some(Boolean))) {
      message += ' · 传奇选取率已生成';
    }
    showToast(message, newlyEligible.length ? 'warn' : 'success', 4200);
  }

  function openChampionDialog(champion) {
    const players = playerChips(champion.team, 'md') || '阵容待补充';
    els.championTeam.innerHTML = `
      <div class="champion-team-name">${escapeHTML(champion.team.name)}</div>
      <div class="champion-team-players">${players}</div>
      <div class="champion-team-points">最终积分 <b>${champion.total}</b> · 第 ${champion.matchNumber} 局 ${escapeHTML(champion.map)}</div>
    `;
    els.championDialog.showModal();
    window.setTimeout(() => els.championConfirmBtn.focus(), 50);
  }

  /* ------------------------------ teams ------------------------------ */
  function openTeamDialog(teamId = null) {
    if (!ensureAdmin()) return;
    const team = teamId ? getTeam(teamId) : null;
    if (!team && computeStandings().champion) {
      showToast('赛事已定榜，无法新增队伍。如需调整，请先撤销冠军对局。', 'warn', 4200);
      return;
    }
    els.teamForm.reset();
    els.teamId.value = team ? team.id : '';
    els.teamDialogTitle.textContent = team ? '编辑队伍' : '添加队伍';
    els.teamName.value = team ? team.name : '';
    els.playerInputs.forEach((input, index) => {
      input.value = team ? getPlayerName(team.players[index]) : '';
    });
    els.playerRanks.forEach((select, index) => {
      select.value = team ? normalizeRank(team.players[index] && team.players[index].rank) : '';
    });
    syncRankPreviews();
    els.teamRestricted.checked = Boolean(team && team.restricted);
    updateTeamPreview();
    els.teamDialog.showModal();
    window.setTimeout(() => els.teamName.focus(), 60);
  }

  function syncRankPreview(index) {
    const select = els.playerRanks[index];
    if (!select) return;
    const meta = rankMeta(select.value);
    const slot = els.rankSlots[index];
    const image = els.rankPreviews[index];
    if (meta) {
      slot.style.setProperty('--rank-color', meta.color);
      slot.classList.add('has-rank');
      select.style.setProperty('--rank-color', meta.color);
      image.src = meta.icon;
      image.alt = meta.name;
      image.hidden = false;
    } else {
      slot.style.removeProperty('--rank-color');
      slot.classList.remove('has-rank');
      select.style.removeProperty('--rank-color');
      image.removeAttribute('src');
      image.alt = '';
      image.hidden = true;
    }
  }

  function syncRankPreviews() {
    els.playerRanks.forEach((_, index) => syncRankPreview(index));
  }

  function updateTeamPreview() {
    const name = els.teamName.value.trim() || '新队伍';
    const players = els.playerInputs
      .map((input, index) => ({
        name: input.value.trim(),
        rank: normalizeRank(els.playerRanks[index].value)
      }))
      .filter((item) => item.name);
    const chips = players.map((item) => playerChip(item, 'sm')).join('');
    els.teamPreview.style.setProperty('--team-accent', rankAccentFromPlayers(players));
    els.teamPreview.innerHTML = `
      <div class="preview-copy">
        <b>${escapeHTML(name)}</b>
        ${els.teamRestricted.checked ? '<span class="preview-restriction">能力限制</span>' : ''}
        <span class="preview-roster">${chips || '<span class="team-subline">阵容待补充</span>'}</span>
      </div>
    `;
  }

  function saveTeam(event) {
    event.preventDefault();
    if (!ensureAdmin()) return;
    const id = els.teamId.value;
    const name = els.teamName.value.trim();
    const players = els.playerInputs.map((input, index) => ({
      name: input.value.trim().slice(0, 20),
      rank: normalizeRank(els.playerRanks[index].value)
    }));
    const editing = Boolean(id);
    const existing = editing ? getTeam(id) : null;

    if (!name) {
      showToast('请填写队伍名称。', 'error');
      els.teamName.focus();
      return;
    }
    const duplicate = appState.teams.some((team) => team.id !== id && team.name.trim().toLowerCase() === name.toLowerCase());
    if (duplicate) {
      showToast('已有同名队伍，请换一个队名。', 'error');
      els.teamName.focus();
      return;
    }
    if (!editing && appState.teams.length >= MAX_TEAMS) {
      showToast(`最多支持 ${MAX_TEAMS} 支队伍。`, 'error');
      return;
    }

    if (editing && existing) {
      existing.name = name;
      delete existing.color;
      existing.players = players;
      existing.restricted = Boolean(els.teamRestricted.checked);
      showToast(`已更新 ${name}`);
    } else {
      appState.teams.push({ id: uid('team'), name, players, restricted: Boolean(els.teamRestricted.checked) });
      showToast(`已添加 ${name}`);
    }

    saveState();
    refreshRosterBaselineIfPristine();
    els.teamDialog.close();
    renderAll();
  }

  async function deleteTeam(teamId) {
    if (!ensureAdmin()) return;
    const team = getTeam(teamId);
    if (!team) return;
    if (computeStandings().champion) {
      showToast('赛事已定榜，无法删除队伍。如需调整，请先撤销冠军对局。', 'warn', 4200);
      return;
    }
    if (appState.teams.length <= 1) {
      showToast('至少需要保留一支队伍。', 'error');
      return;
    }
    const hasResults = appState.matches.some((match) => match.results.some((result) => result.teamId === teamId));
    if (hasResults) {
      showToast('该队伍已有对局记录，无法删除。可先清空所有对局。', 'error', 4200);
      return;
    }

    const confirmed = await askConfirm({
      title: '删除队伍',
      message: `确定删除「${team.name}」吗？此操作不可撤销。`,
      okText: '删除队伍',
      danger: true
    });
    if (!confirmed) return;

    appState.teams = appState.teams.filter((item) => item.id !== teamId);
    saveState();
    refreshRosterBaselineIfPristine();
    renderAll();
    showToast(`已删除 ${team.name}`, 'warn');
  }

  /* ------------------------------ data ------------------------------ */
  function exportData() {
    const payload = {
      ...appState,
      app: 'apex-scoreboard',
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    link.href = url;
    link.download = `apex-scoreboard-${date}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    showToast('比赛数据已导出。');
  }

  async function importData(file) {
    if (!ensureAdmin()) return;
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = normalizeState(parsed);
      const confirmed = await askConfirm({
        title: '导入比赛数据',
        message: `将覆盖当前赛事：${imported.teams.length} 支队伍、${imported.matches.length} 局记录。导入后当前数据不可恢复。`,
        okText: '确认导入',
        danger: true
      });
      if (!confirmed) return;
      appState = imported;
      saveState();
      saveRosterBaseline(appState.teams);
      renderAll();
      navigate('standings');
      showToast(`导入成功 · ${appState.teams.length} 支队伍 / ${appState.matches.length} 局`);
    } catch (error) {
      console.error(error);
      showToast('导入失败：文件不是有效的记分板备份。', 'error', 4500);
    } finally {
      els.importFile.value = '';
    }
  }

  async function clearMatches() {
    if (!ensureAdmin()) return;
    if (!appState.matches.length) {
      showToast('当前没有对局记录。', 'warn');
      return;
    }
    const hasChampion = Boolean(computeStandings().champion);
    const confirmed = await askConfirm({
      title: '清空所有对局',
      message: hasChampion
        ? '当前赛事已经产生冠军。清空所有对局会删除全部战绩并解除定榜，队伍名单和赛事设置会保留。'
        : '将删除全部对局记录，队伍名单和赛事设置会保留。此操作不可撤销。',
      okText: '清空对局',
      danger: true
    });
    if (!confirmed) return;

    appState.matches = [];
    appState.legendDraft = null;
    saveState();
    renderAll();
    navigate('standings');
    showToast('所有对局已清空。', 'warn');
  }

  async function resetAll() {
    if (!ensureAdmin()) return;
    const baseline = loadRosterBaseline() || deepClone(appState.teams);
    const confirmed = await askConfirm({
      title: '恢复初始数据',
      message: '将清除当前所有对局和赛事设置，队伍名单恢复为已保存的自定义初始名单。建议先导出备份。',
      okText: '恢复初始',
      danger: true
    });
    if (!confirmed) return;

    saveRosterBaseline(baseline);
    appState = defaultState();
    appState.teams = deepClone(baseline);
    saveState();
    renderAll();
    navigate('standings');
    showToast('已恢复自定义初始名单。', 'warn');
  }

  async function undoLastMatch() {
    if (!ensureAdmin()) return;
    if (!appState.matches.length) {
      showToast('没有可撤销的对局。', 'warn');
      return;
    }
    const last = appState.matches[appState.matches.length - 1];
    const champion = computeStandings().champion;
    const isChampionship = champion && champion.matchId === last.id;
    const confirmed = await askConfirm({
      title: isChampionship ? '撤销冠军对局' : '撤销上一局',
      message: isChampionship
        ? `第 ${appState.matches.length} 局（${last.map}）产生了冠军。撤销后赛事将解除定榜，并可重新录入本局。`
        : `将删除第 ${appState.matches.length} 局（${last.map}）的全部记录，此操作不可撤销。`,
      okText: '撤销本局',
      danger: true
    });
    if (!confirmed) return;

    appState.matches.pop();
    const restoredPicks = {};
    let hasRestoredPicks = false;
    (last.results || []).forEach((result) => {
      const picks = normalizeLegendPicks(result.legends);
      restoredPicks[result.teamId] = picks;
      if (picks.some(Boolean)) hasRestoredPicks = true;
    });
    appState.legendDraft = hasRestoredPicks
      ? {
          picks: restoredPicks,
          createdAt: last.createdAt,
          updatedAt: new Date().toISOString()
        }
      : null;
    saveState();
    renderAll();
    if (currentView() !== 'matches') navigate('matches');
    showToast(`已撤销第 ${appState.matches.length + 1} 局。`, 'warn');
  }

  /* ------------------------------ events ------------------------------ */
  function readCloudFormConfig() {
    return { token: els.cloudToken.value.trim() };
  }

  function commitCloudConfigFromForm() {
    const next = readCloudFormConfig();
    window.clearTimeout(cloudPushTimer);
    cloudConfig = next;
    saveCloudConfig();
    cloudReady = true;
    updateCloudSettingsUI();
    return next;
  }

  function reportCloudConfigError(error) {
    setCloudStatus(error.message, 'error');
    showToast(error.message, 'error', 4200);
  }

  async function handleCloudTest() {
    if (!ensureAdmin()) return;
    try {
      commitCloudConfigFromForm();
      await testCloudConnection();
    } catch (error) {
      reportCloudConfigError(error);
    }
  }

  async function handleCloudPull() {
    if (!ensureAdmin()) return;
    try {
      commitCloudConfigFromForm();
      await hydrateCloudState();
    } catch (error) {
      reportCloudConfigError(error);
    }
  }

  async function handleCloudPush() {
    if (!ensureAdmin()) return;
    try {
      commitCloudConfigFromForm();
      await pushCloudState({ manual: true });
    } catch (error) {
      reportCloudConfigError(error);
    }
  }

  async function handleCloudShare() {
    if (!ensureAdmin()) return;
    try {
      commitCloudConfigFromForm();
      const url = new URL(window.location.href);
      url.hash = '';
      url.searchParams.delete('cloud');
      url.searchParams.delete('storage');
      const ok = await copyText(url.toString());
      setCloudStatus(ok ? '观众链接已复制。' : '复制失败，请手动复制地址。', ok ? 'ok' : 'error');
      showToast(ok ? '观众链接已复制。' : '复制失败，请手动复制地址。', ok ? 'success' : 'error');
    } catch (error) {
      reportCloudConfigError(error);
    }
  }

  async function saveCloudSettings(event) {
    event.preventDefault();
    if (!ensureAdmin()) return;
    try {
      commitCloudConfigFromForm();
      setCloudStatus('Netlify 云存储设置已保存，可测试连接或上传当前数据。', 'ok');
      testCloudConnection({ manual: false });
      showToast('Netlify 云存储设置已保存。');
    } catch (error) {
      reportCloudConfigError(error);
    }
  }

  function bindEvents() {
    els.brand.addEventListener('click', handleBrandClick);
    els.authForm.addEventListener('submit', submitAuth);
    els.authCloseBtn.addEventListener('click', () => els.authDialog.close());
    els.authCancelBtn.addEventListener('click', () => els.authDialog.close());
    els.authDialog.addEventListener('click', (event) => {
      if (event.target === els.authDialog) els.authDialog.close();
    });
    els.authPassword.addEventListener('input', () => {
      els.authError.hidden = true;
    });

    window.addEventListener('hashchange', applyView);
    window.addEventListener('resize', () => {
      if (currentView() === 'matches') syncTimelineAxis();
    });
    els.matchesList.addEventListener('toggle', () => {
      window.requestAnimationFrame(syncTimelineAxis);
    }, true);
    els.matchesList.addEventListener('click', (event) => {
      const openButton = event.target.closest('[data-open-legend-report]');
      if (openButton) {
        openLegendReport(openButton.dataset.openLegendReport);
        return;
      }
      const copyButton = event.target.closest('[data-copy-legend-report]');
      if (!copyButton) return;
      copyMatchLegendReport(copyButton.dataset.copyLegendReport);
    });
    els.banOverview.addEventListener('click', (event) => {
      if (event.target.closest('[data-copy-current-bans]')) copyCurrentBanList();
    });

    els.legendEntryBtn.addEventListener('click', openLegendEditor);
    els.entryLegendBtn.addEventListener('click', openLegendEditor);
    els.legendTeams.addEventListener('click', (event) => {
      const slot = event.target.closest('[data-legend-team][data-legend-player]');
      if (!slot) return;
      openLegendPicker(slot.dataset.legendTeam, Number(slot.dataset.legendPlayer));
    });
    els.legendSaveBtn.addEventListener('click', saveLegendEditor);
    els.legendCancelBtn.addEventListener('click', closeLegendEditor);
    els.legendCloseBtn.addEventListener('click', closeLegendEditor);
    els.legendCopyBtn.addEventListener('click', copyLegendDraftReport);
    els.legendDialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeLegendEditor();
    });
    els.legendDialog.addEventListener('click', (event) => {
      if (event.target === els.legendDialog) closeLegendEditor();
    });
    els.legendDialog.addEventListener('close', () => {
      legendDraftEditor = null;
      if (els.legendPickerDialog.open) els.legendPickerDialog.close();
    });

    els.legendPickerGrid.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-legend-choice]');
      if (!choice) return;
      chooseLegend(choice.dataset.legendChoice);
    });
    els.legendPickerSearch.addEventListener('input', renderLegendPicker);
    els.legendPickerCloseBtn.addEventListener('click', () => els.legendPickerDialog.close());
    els.legendClearBtn.addEventListener('click', () => {
      if (legendPickerTarget) {
        setEditorPick(legendPickerTarget.teamId, legendPickerTarget.playerIndex, null);
        legendPickerTarget = null;
      }
      els.legendPickerDialog.close();
      renderLegendEditor();
    });
    els.legendPickerDialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      els.legendPickerDialog.close();
    });
    els.legendPickerDialog.addEventListener('close', () => {
      legendPickerTarget = null;
    });
    els.legendPickerDialog.addEventListener('click', (event) => {
      if (event.target === els.legendPickerDialog) els.legendPickerDialog.close();
    });

    els.legendReportCloseBtn.addEventListener('click', () => els.legendReportDialog.close());
    els.legendReportCloseBtn2.addEventListener('click', () => els.legendReportDialog.close());
    els.legendReportCopyBtn.addEventListener('click', () => {
      if (legendReportMatchId) copyMatchLegendReport(legendReportMatchId);
    });
    els.legendReportDialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      els.legendReportDialog.close();
    });
    els.legendReportDialog.addEventListener('click', (event) => {
      if (event.target === els.legendReportDialog) els.legendReportDialog.close();
    });

    els.addMatchBtn.addEventListener('click', openEntry);
    els.addMatchBtn2.addEventListener('click', openEntry);
    els.undoMatchBtn.addEventListener('click', undoLastMatch);
    els.addTeamBtn.addEventListener('click', () => openTeamDialog());

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-action]');
      if (!trigger) return;
      const action = trigger.dataset.action;
      if (action === 'open-entry') openEntry();
      if (action === 'open-legend') openLegendEditor();
      if (action === 'edit-team') openTeamDialog(trigger.dataset.teamId);
      if (action === 'delete-team') deleteTeam(trigger.dataset.teamId);
    });

    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLElement && (
        target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.tagName === 'SELECT'
        || target.isContentEditable
      );
      const anyDialog = $('dialog[open]');

      if ((event.key === 'n' || event.key === 'N') && !isTyping && !anyDialog && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        openEntry();
      }
    });

    // entry dialog
    $('#entryCloseBtn').addEventListener('click', () => els.entryDialog.close());
    $('#entryCancelBtn').addEventListener('click', () => els.entryDialog.close());
    els.entrySaveBtn.addEventListener('click', saveEntry);
    els.entryMap.addEventListener('change', () => {
      if (entryDraft) entryDraft.map = els.entryMap.value;
    });
    els.entrySortBtn.addEventListener('click', () => {
      if (!entryDraft) return;
      entryDraft.order = computeStandings().rows.map((row) => row.team.id);
      entryDraft.pool = [];
      renderEntryWorkspace();
    });
    els.entryDialog.addEventListener('click', (event) => {
      if (event.target === els.entryDialog) els.entryDialog.close();
    });

    els.entryList.addEventListener('mousedown', (event) => {
      entryDragSuppressed = Boolean(event.target.closest('input, button, select, textarea, a'));
      const control = event.target.closest('.kill-btn, .entry-return-btn');
      if (!control) return;
      // Keep rapid +/- and reorder clicks from starting a text selection or
      // stealing focus from the kill input.
      event.preventDefault();
    }, true);

    els.entryList.addEventListener('mouseup', () => {
      entryDragSuppressed = false;
    });

    els.entryList.addEventListener('click', (event) => {
      if (!entryDraft) return;
      const button = event.target.closest('[data-entry-action]');
      if (!button) return;
      const row = button.closest('.entry-row');
      if (!row) return;
      const teamId = row.dataset.teamId;
      const action = button.dataset.entryAction;
      if (action === 'return') returnEntryToPool(teamId);
      if (action === 'kill-up') changeKills(teamId, 1);
      if (action === 'kill-down') changeKills(teamId, -1);
    });

    els.entryList.addEventListener('input', (event) => {
      if (!entryDraft) return;
      const input = event.target.closest('.kill-input');
      if (!input) return;
      const row = input.closest('.entry-row');
      if (!row) return;
      const teamId = row.dataset.teamId;
      const digits = input.value.replace(/\D/g, '').slice(0, 2);
      if (digits !== input.value) input.value = digits;
      entryDraft.kills[teamId] = digits === '' ? 0 : clampInt(digits, 0, MAX_KILLS, 0);
      updateEntryTotals();
    });

    els.entryList.addEventListener('focusout', (event) => {
      const input = event.target.closest('.kill-input');
      if (!input || !entryDraft) return;
      const row = input.closest('.entry-row');
      if (!row) return;
      const teamId = row.dataset.teamId;
      const value = clampInt(input.value, 0, MAX_KILLS, 0);
      input.value = value;
      entryDraft.kills[teamId] = value;
      updateEntryTotals();
    });

    els.entryList.addEventListener('dragstart', (event) => {
      const row = event.target.closest('.entry-row');
      if (!row || !entryDraft || entryDragSuppressed || event.target.closest('input, button, select, textarea, a')) {
        event.preventDefault();
        return;
      }
      draggedTeamId = row.dataset.teamId;
      entryDragSource = 'board';
      els.entryEndDrop.classList.remove('is-visible');
      clearEntryDropIndicator();
      row.classList.add('dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', draggedTeamId);
      }
    });

    els.entryList.addEventListener('dragover', (event) => {
      if (!draggedTeamId) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      showEntryDropIndicator(getEntryDropInfo(event));
    });

    els.entryList.addEventListener('dragleave', (event) => {
      if (!els.entryList.contains(event.relatedTarget)) clearEntryDropIndicator();
    });

    els.entryList.addEventListener('drop', (event) => {
      if (!draggedTeamId || !entryDraft) return;
      event.preventDefault();
      const source = entryDragSource;
      const index = getEntryDropInfo(event).index;
      const nextOrder = source === 'board'
        ? entryDraft.order.filter((id) => id !== draggedTeamId)
        : entryDraft.order.slice();
      nextOrder.splice(Math.min(index, nextOrder.length), 0, draggedTeamId);

      if (source === 'pool') {
        entryDraft.pool = entryDraft.pool.filter((id) => id !== draggedTeamId);
        entryDraft.kills[draggedTeamId] = 0;
      }
      entryDraft.order = nextOrder;
      resetEntryDrag();
      renderEntryWorkspace();
    });

    els.entryList.addEventListener('dragend', resetEntryDrag);

    els.entryPool.addEventListener('dragstart', (event) => {
      const card = event.target.closest('.pool-card');
      if (!card || !entryDraft) {
        event.preventDefault();
        return;
      }
      draggedTeamId = card.dataset.poolTeamId;
      entryDragSource = 'pool';
      els.entryEndDrop.classList.add('is-visible');
      clearEntryDropIndicator();
      card.classList.add('dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', draggedTeamId);
      }
    });

    els.entryPool.addEventListener('dragend', resetEntryDrag);

    els.entryEndDrop.addEventListener('dragover', (event) => {
      if (!draggedTeamId || !entryDraft) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      clearEntryDropIndicator();
      els.entryEndDrop.classList.add('is-over');
    });

    els.entryEndDrop.addEventListener('dragleave', (event) => {
      if (!els.entryEndDrop.contains(event.relatedTarget)) {
        els.entryEndDrop.classList.remove('is-over');
      }
    });

    els.entryEndDrop.addEventListener('drop', (event) => {
      if (!draggedTeamId || !entryDraft) return;
      event.preventDefault();
      dropEntryAtEnd();
    });

    // team dialog
    $('#teamCloseBtn').addEventListener('click', () => els.teamDialog.close());
    $('#teamCancelBtn').addEventListener('click', () => els.teamDialog.close());
    els.teamDialog.addEventListener('click', (event) => {
      if (event.target === els.teamDialog) els.teamDialog.close();
    });
    els.teamForm.addEventListener('submit', saveTeam);
    els.teamName.addEventListener('input', updateTeamPreview);
    els.playerInputs.forEach((input) => input.addEventListener('input', updateTeamPreview));
    els.playerRanks.forEach((select, index) => {
      select.addEventListener('change', () => {
        syncRankPreview(index);
        updateTeamPreview();
      });
    });
    els.teamRestricted.addEventListener('change', updateTeamPreview);

    // confirm
    els.confirmOkBtn.addEventListener('click', () => confirmResolver && confirmResolver(true));
    $('#confirmCancelBtn').addEventListener('click', () => confirmResolver && confirmResolver(false));
    els.confirmDialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (confirmResolver) confirmResolver(false);
    });
    els.confirmDialog.addEventListener('click', (event) => {
      if (event.target === els.confirmDialog && confirmResolver) confirmResolver(false);
    });

    // champion
    els.championConfirmBtn.addEventListener('click', () => {
      els.championDialog.close();
      navigate('standings');
    });
    els.championDialog.addEventListener('click', (event) => {
      if (event.target === els.championDialog) els.championDialog.close();
    });

    // settings
    els.rulesGuideBtn.addEventListener('click', openRulesGuide);
    els.rulesGuideCloseBtn.addEventListener('click', () => els.rulesGuideDialog.close());
    els.rulesGuideOkBtn.addEventListener('click', () => els.rulesGuideDialog.close());
    els.rulesGuideDialog.addEventListener('click', (event) => {
      if (event.target === els.rulesGuideDialog) els.rulesGuideDialog.close();
    });

    els.cloudStorageForm.addEventListener('submit', saveCloudSettings);
    els.cloudTestBtn.addEventListener('click', handleCloudTest);
    els.cloudPullBtn.addEventListener('click', handleCloudPull);
    els.cloudPushBtn.addEventListener('click', handleCloudPush);
    els.cloudShareBtn.addEventListener('click', handleCloudShare);

    els.settingsForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!ensureAdmin()) return;
      const name = els.settingName.value.trim();
      const subtitle = els.settingSubtitle.value.trim();
      const threshold = clampInt(els.settingThreshold.value, 1, 999, 50);
      if (!name) {
        showToast('赛事名称不能为空。', 'error');
        els.settingName.focus();
        return;
      }
      if (appState.matches.length && threshold !== appState.event.threshold) {
        showToast('已有对局记录，赛点线不可修改。', 'error');
        renderSettings();
        return;
      }
      appState.event.name = name.slice(0, 28);
      appState.event.subtitle = subtitle.slice(0, 48);
      appState.event.threshold = threshold;
      const banMode = $('input[name="banReleaseMode"]:checked');
      appState.event.banReleaseMode = banMode && banMode.value === 'earliest' ? 'earliest' : 'all';
      appState.event.legendCopyLimit = ['3', '5', 'all'].includes(els.settingLegendCopyLimit.value)
        ? els.settingLegendCopyLimit.value
        : '5';
      appState.event.backgroundStyle = els.settingBackgroundStyle.value === 'classic' ? 'classic' : 'prism';
      saveState();
      renderAll();
      showToast('赛事设置已保存。');
    });

    els.clearMatchesBtn.addEventListener('click', clearMatches);
    els.resetAllBtn.addEventListener('click', resetAll);
    els.exportBtn.addEventListener('click', exportData);
    els.importBtn.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', () => importData(els.importFile.files[0]));
  }

  /* ------------------------------ init ------------------------------ */
  bindEvents();
  ensureRosterBaseline();
  migrateLegacyEventName();
  saveState({ skipCloud: true });
  adminMode = readAdminSession();
  applyAuthUI();
  renderAll();
  applyView();
  hydrateCloudState({ silent: true }).finally(hideBootLoader);
  if (!window.location.hash || !VALID_VIEWS.has(window.location.hash.replace('#', ''))) {
    window.history.replaceState(null, '', '#standings');
    applyView();
  }
})();
