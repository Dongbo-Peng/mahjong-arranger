const STORAGE_KEY = "mahjong-arranger-v1";
const STAKE_VALUES = ["1", "2", "3", "4"];
const sampleState = {
  players: [
    { id: "p1", name: "老张", preferred: "2", stakes: ["1", "2"], skill: "熟手", active: true },
    { id: "p2", name: "阿明", preferred: "2", stakes: ["2", "3"], skill: "熟手", active: true },
    { id: "p3", name: "陈姐", preferred: "2", stakes: ["2"], skill: "熟手", active: true },
    { id: "p4", name: "小周", preferred: "2", stakes: ["1", "2"], skill: "新手", active: true },
    { id: "p5", name: "老刘", preferred: "3", stakes: ["2", "3"], skill: "高手", active: true },
    { id: "p6", name: "王哥", preferred: "3", stakes: ["3"], skill: "高手", active: true },
    { id: "p7", name: "赵姐", preferred: "3", stakes: ["2", "3"], skill: "高手", active: true },
    { id: "p8", name: "阿强", preferred: "3", stakes: ["3"], skill: "熟手", active: true },
    { id: "p9", name: "孙叔", preferred: "1", stakes: ["1"], skill: "新手", active: true },
    { id: "p10", name: "李姐", preferred: "1", stakes: ["1", "2"], skill: "新手", active: true },
    { id: "p11", name: "老吴", preferred: "1", stakes: ["1"], skill: "熟手", active: true },
    { id: "p12", name: "小何", preferred: "1", stakes: ["1", "2"], skill: "新手", active: true },
    { id: "p13", name: "钱哥", preferred: "2", stakes: ["1", "2", "3"], skill: "熟手", active: true },
    { id: "p14", name: "周姐", preferred: "2", stakes: ["2"], skill: "高手", active: false },
    { id: "p15", name: "老马", preferred: "3", stakes: ["2", "3"], skill: "高手", active: false },
    { id: "p16", name: "阿亮", preferred: "1", stakes: ["1", "2"], skill: "熟手", active: false },
  ],
  conflicts: [
    { from: "p1", to: "p5" },
    { from: "p6", to: "p8" },
    { from: "p10", to: "p11" },
  ],
  likes: [
    { from: "p4", to: "p10" },
    { from: "p9", to: "p12" },
  ],
  savedSchedule: null,
  updatedAt: null,
};

let state = loadState();
let lastSchedule = hydrateSavedSchedule(state.savedSchedule);
const playerEditDrafts = new Map();

const elements = {
  activeCount: document.querySelector("#activeCount"),
  tableCount: document.querySelector("#tableCount"),
  waitingCount: document.querySelector("#waitingCount"),
  conflictCount: document.querySelector("#conflictCount"),
  summaryCards: document.querySelectorAll("[data-detail]"),
  playerList: document.querySelector("#playerList"),
  tableResults: document.querySelector("#tableResults"),
  waitingList: document.querySelector("#waitingList"),
  resultNote: document.querySelector("#resultNote"),
  stakeFilter: document.querySelector("#stakeFilter"),
  toggleAllBtn: document.querySelector("#toggleAllBtn"),
  arrangeBtn: document.querySelector("#arrangeBtn"),
  dataManageBtn: document.querySelector("#dataManageBtn"),
  resetSampleBtn: document.querySelector("#resetSampleBtn"),
  copyBtn: document.querySelector("#copyBtn"),
  playerForm: document.querySelector("#playerForm"),
  preferredInput: document.querySelector("#preferredInput"),
  fromPlayer: document.querySelector("#fromPlayer"),
  toPlayer: document.querySelector("#toPlayer"),
  addConflictBtn: document.querySelector("#addConflictBtn"),
  conflictList: document.querySelector("#conflictList"),
  playerTemplate: document.querySelector("#playerTemplate"),
  detailModal: document.querySelector("#detailModal"),
  detailTitle: document.querySelector("#detailTitle"),
  detailBody: document.querySelector("#detailBody"),
  detailCloseButtons: document.querySelectorAll("[data-close-detail]"),
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(sampleState);
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.players) || !Array.isArray(parsed.conflicts)) {
      return structuredClone(sampleState);
    }
    if (!Array.isArray(parsed.likes)) parsed.likes = [];
    if (!("savedSchedule" in parsed)) parsed.savedSchedule = null;
    if (!("updatedAt" in parsed)) parsed.updatedAt = null;
    return parsed;
  } catch {
    return structuredClone(sampleState);
  }
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function serializeSchedule(schedule) {
  if (!schedule) return null;
  return {
    tables: schedule.tables.map((table) => ({
      stake: table.stake,
      groupIds: normalizedSeats(table).map((player) => (player ? player.id : null)),
      manual: Boolean(table.manual),
    })),
  };
}

function hydrateSavedSchedule(savedSchedule) {
  if (!savedSchedule || !Array.isArray(savedSchedule.tables)) return null;

  const tables = savedSchedule.tables.map((table) => ({
    stake: table.stake || "1",
    group: (Array.isArray(table.groupIds) ? table.groupIds : []).map((id) => (id ? getPlayer(id) || null : null)),
    score: 0,
    manual: Boolean(table.manual),
  }));

  const schedule = { tables, waiting: [] };
  normalizeSchedule(schedule);
  recalcWaitingFromSchedule(schedule);
  return schedule;
}

function saveSchedule() {
  state.savedSchedule = serializeSchedule(lastSchedule);
  saveState();
}

function clearSchedule() {
  lastSchedule = null;
  state.savedSchedule = null;
}

function stakeText(value) {
  return { "1": "打一", "2": "打二", "3": "打三", "4": "打四" }[value] || `打${value}`;
}

function getPlayer(id) {
  return state.players.find((player) => player.id === id);
}

function activePlayers() {
  return state.players.filter((player) => player.active);
}

function directedConflict(a, b) {
  return state.conflicts.some((rule) => rule.from === a.id && rule.to === b.id);
}

function directedLike(a, b) {
  return state.likes.some((rule) => rule.from === a.id && rule.to === b.id);
}

function pairBlocked(a, b) {
  return directedConflict(a, b) || directedConflict(b, a);
}

function preferredGapBlocked(a, b) {
  return Math.abs(Number(a.preferred) - Number(b.preferred)) > 1;
}

function skillGapBlocked(a, b) {
  return [a.skill, b.skill].includes("新手") && [a.skill, b.skill].includes("高手");
}

function autoPairBlocked(a, b) {
  return pairBlocked(a, b) || preferredGapBlocked(a, b) || skillGapBlocked(a, b);
}

function pairLikeCount(a, b) {
  return Number(directedLike(a, b)) + Number(directedLike(b, a));
}

function hasBlockedPair(group) {
  for (let i = 0; i < group.length; i += 1) {
    for (let j = i + 1; j < group.length; j += 1) {
      if (autoPairBlocked(group[i], group[j])) return true;
    }
  }
  return false;
}

function preferredSpread(group) {
  const values = group.map((player) => Number(player.preferred));
  return Math.max(...values) - Math.min(...values);
}

function commonStakes(group) {
  const [first, ...rest] = group;
  return first.stakes.filter((stake) => rest.every((player) => player.stakes.includes(stake)));
}

function chooseStake(group, options) {
  const averagePreferred = group.reduce((sum, player) => sum + Number(player.preferred), 0) / group.length;
  return options
    .map((stake) => ({
      stake,
      preferredHits: group.filter((player) => player.preferred === stake).length,
      flexibility: group.reduce((sum, player) => sum + player.stakes.length, 0),
      distanceFromAverage: Math.abs(Number(stake) - averagePreferred),
    }))
    .sort(
      (a, b) =>
        b.preferredHits - a.preferredHits ||
        a.distanceFromAverage - b.distanceFromAverage ||
        Number(a.stake) - Number(b.stake) ||
        a.flexibility - b.flexibility,
    )[0].stake;
}

function scoreGroup(group, chosenStake) {
  const preferredHits = group.filter((player) => player.preferred === chosenStake).length;
  let likeScore = 0;
  for (let i = 0; i < group.length; i += 1) {
    for (let j = i + 1; j < group.length; j += 1) {
      likeScore += pairLikeCount(group[i], group[j]);
    }
  }
  return preferredHits * 28 + likeScore * 16;
}

function combinations(items, size) {
  const result = [];
  const path = [];

  function walk(start) {
    if (path.length === size) {
      result.push(path.slice());
      return;
    }
    for (let i = start; i <= items.length - (size - path.length); i += 1) {
      path.push(items[i]);
      walk(i + 1);
      path.pop();
    }
  }

  walk(0);
  return result;
}

function createCandidates(players) {
  const indexById = new Map(players.map((player, index) => [player.id, index]));
  return combinations(players, 4)
    .map((group) => {
      const options = commonStakes(group);
      if (!options.length || preferredSpread(group) > 1 || hasBlockedPair(group)) return null;
      const stake = chooseStake(group, options);
      const mask = group.reduce((bits, player) => bits | (1 << indexById.get(player.id)), 0);
      return {
        group,
        stake,
        mask,
        score: scoreGroup(group, stake),
      };
    })
    .filter(Boolean);
}

function bitCount(mask) {
  let count = 0;
  let value = mask;
  while (value) {
    value &= value - 1;
    count += 1;
  }
  return count;
}

function firstBit(mask) {
  for (let i = 0; i < 20; i += 1) {
    if (mask & (1 << i)) return i;
  }
  return -1;
}

function arrangeTables() {
  const players = activePlayers();
  const candidates = createCandidates(players);
  const byFirstIndex = new Map();

  candidates.forEach((candidate) => {
    for (let i = 0; i < players.length; i += 1) {
      if (candidate.mask & (1 << i)) {
        if (!byFirstIndex.has(i)) byFirstIndex.set(i, []);
        byFirstIndex.get(i).push(candidate);
      }
    }
  });

  for (const list of byFirstIndex.values()) {
    list.sort((a, b) => b.score - a.score);
  }

  let best = { seated: 0, score: -Infinity, tables: [] };
  const fullMask = players.reduce((mask, _player, index) => mask | (1 << index), 0);

  function search(mask, tables, seated, score) {
    const possibleSeated = seated + Math.floor(bitCount(mask) / 4) * 4;
    if (possibleSeated < best.seated) return;
    if (possibleSeated === best.seated && score <= best.score - 80) return;

    if (bitCount(mask) < 4) {
      if (seated > best.seated || (seated === best.seated && score > best.score)) {
        best = { seated, score, tables: tables.slice() };
      }
      return;
    }

    const pivot = firstBit(mask);
    const options = (byFirstIndex.get(pivot) || []).filter((candidate) => (candidate.mask & mask) === candidate.mask);

    for (const candidate of options) {
      tables.push(candidate);
      search(mask ^ candidate.mask, tables, seated + 4, score + candidate.score);
      tables.pop();
    }

    search(mask & ~(1 << pivot), tables, seated, score);
  }

  search(fullMask, [], 0, 0);

  const seatedIds = new Set(best.tables.flatMap((table) => table.group.map((player) => player.id)));
  const waiting = players
    .filter((player) => !seatedIds.has(player.id))
    .map((player) => ({
      player,
      reason: explainWaiting(player, players.filter((candidate) => candidate.id !== player.id)),
    }));

  return { tables: best.tables, waiting };
}

function explainWaiting(player, others) {
  const strictBlockedNames = others.filter((other) => pairBlocked(player, other)).map((other) => other.name);
  if (strictBlockedNames.length) {
    return `有不愿同桌限制：${strictBlockedNames.slice(0, 3).join("、")}`;
  }

  const amountGapNames = others.filter((other) => preferredGapBlocked(player, other)).map((other) => other.name);
  if (amountGapNames.length >= Math.max(1, others.length - 2)) {
    return `常打金额差距太大，已放入待定`;
  }

  const skillGapNames = others.filter((other) => skillGapBlocked(player, other)).map((other) => other.name);
  if (skillGapNames.length) {
    return `新手和高手不自动同桌，已放入待定`;
  }

  const compatible = others.filter((other) => !autoPairBlocked(player, other));
  const sameStake = compatible.filter((other) => other.stakes.some((stake) => player.stakes.includes(stake)));
  if (sameStake.length < 3) {
    return `能匹配同一金额的人不足 3 位`;
  }
  return "人数或组合被其他桌占用，可由老板手动调整";
}

function render() {
  renderSummary();
  renderPlayers();
  renderPlayerOptions();
  renderConflicts();
}

function renderSummary() {
  elements.activeCount.textContent = activePlayers().length;
  elements.tableCount.textContent = lastSchedule ? lastSchedule.tables.filter((table) => table.group.some(Boolean)).length : 0;
  elements.waitingCount.textContent = lastSchedule ? lastSchedule.waiting.length : activePlayers().length;
  elements.conflictCount.textContent = state.conflicts.length + state.likes.length;
}

function renderPlayers() {
  const stakeFilter = elements.stakeFilter.value;
  elements.playerList.innerHTML = "";

  const players = state.players.filter((player) => {
    const stakeOk = stakeFilter === "all" || player.stakes.includes(stakeFilter);
    return stakeOk;
  });

  players.forEach((player) => {
    const node = elements.playerTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = node.querySelector(".attend-check");
    const name = node.querySelector("strong");
    const meta = node.querySelector(".player-meta");
    const deleteBtn = node.querySelector(".delete-player");

    node.classList.toggle("attending", player.active);
    checkbox.checked = player.active;
    checkbox.addEventListener("change", () => {
      player.active = checkbox.checked;
      clearSchedule();
      saveState();
      render();
      renderEmptyResults();
    });

    name.textContent = player.name;

    player.stakes.forEach((stake) => {
      const pill = document.createElement("span");
      pill.className = `stake-pill ${player.preferred === stake ? "preferred" : ""}`;
      pill.textContent = stakeText(stake);
      meta.appendChild(pill);
    });

    const conflictNumber = state.conflicts.filter((rule) => rule.from === player.id || rule.to === player.id).length;
    if (conflictNumber) {
      const conflict = document.createElement("span");
      conflict.className = "conflict-pill";
      conflict.textContent = `${conflictNumber} 条限制`;
      meta.appendChild(conflict);
    }

    const likeNumber = state.likes.filter((rule) => rule.from === player.id || rule.to === player.id).length;
    if (likeNumber) {
      const like = document.createElement("span");
      like.className = "like-pill";
      like.textContent = `${likeNumber} 条喜欢`;
      meta.appendChild(like);
    }

    deleteBtn.addEventListener("click", () => deletePlayer(player.id));
    elements.playerList.appendChild(node);
  });
}

function renderPlayerOptions() {
  const options = state.players.map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`).join("");
  elements.fromPlayer.innerHTML = options;
  elements.toPlayer.innerHTML = options;
}

function renderConflicts() {
  elements.conflictList.innerHTML = "";
  if (!state.conflicts.length) {
    elements.conflictList.textContent = "还没有设置关系限制";
    return;
  }

  state.conflicts.forEach((rule, index) => {
    const from = getPlayer(rule.from);
    const to = getPlayer(rule.to);
    if (!from || !to) return;
    const row = document.createElement("div");
    row.className = "conflict-row";
    row.innerHTML = `<span>${escapeHtml(from.name)} 不想和 ${escapeHtml(to.name)} 同桌</span>`;
    const button = document.createElement("button");
    button.className = "mini-button";
    button.type = "button";
    button.title = "删除这条关系";
    button.textContent = "×";
    button.addEventListener("click", () => {
      state.conflicts.splice(index, 1);
      clearSchedule();
      saveState();
      render();
      renderEmptyResults();
    });
    row.appendChild(button);
    elements.conflictList.appendChild(row);
  });
}

function renderSchedule(schedule) {
  elements.tableResults.classList.remove("empty-state");
  elements.tableResults.innerHTML = "";

  if (!schedule.tables.length) {
    renderEmptyResults("今天还排不出完整一桌", "共同金额、人数或不愿同桌关系阻止了组桌。");
  } else {
    schedule.tables.forEach((table, index) => {
      const seatedPlayers = table.group.filter(Boolean);
      const card = document.createElement("article");
      card.className = "table-card";
      card.innerHTML = `
        <div class="table-card-head">
          <strong>${index + 1} 号桌</strong>
          <span class="amount-badge">${stakeText(table.stake)}</span>
        </div>
        <div class="seat-grid">
          ${seatedPlayers
            .map(
              (player) => `
                <div class="seat">
                  <strong>${escapeHtml(player.name)}</strong>
                  <span class="stake-pill ${player.preferred === table.stake ? "preferred" : ""}">常打${player.preferred}</span>
                </div>
              `,
            )
            .join("")}
        </div>
        <div class="reason-line">${seatedPlayers.length} 人已安排，${seatedPlayers.filter((player) => player.preferred === table.stake).length} 人常打这个金额。</div>
      `;
      elements.tableResults.appendChild(card);
    });
  }

  renderWaiting(schedule.waiting);
  elements.resultNote.textContent = `已安排 ${schedule.tables.reduce((sum, table) => sum + table.group.filter(Boolean).length, 0)} 人`;
  renderSummary();
}

function renderWaiting(waiting) {
  if (!waiting.length) {
    elements.waitingList.textContent = "暂无";
    return;
  }
  elements.waitingList.innerHTML = "";
  waiting.forEach(({ player, reason }) => {
    const row = document.createElement("div");
    row.className = "waiting-item";
    row.textContent = `${player.name}：${reason}`;
    elements.waitingList.appendChild(row);
  });
}

function renderEmptyResults(title = "还没有排桌", text = "先勾选今天到场的人，再自动排桌。") {
  elements.tableResults.className = "table-results empty-state";
  elements.tableResults.innerHTML = `<strong>${title}</strong><span>${text}</span>`;
  elements.waitingList.textContent = "暂无";
  elements.resultNote.textContent = "点击“自动排桌”后生成";
  renderSummary();
}

function ensureSchedule() {
  if (!lastSchedule) {
    lastSchedule = arrangeTables();
    renderSchedule(lastSchedule);
    saveSchedule();
  }
  return lastSchedule;
}

function openDetail(kind) {
  if (kind === "attendance") {
    showDetail("今日报名", renderAttendanceDetail());
    return;
  }
  if (kind === "tables") {
    const schedule = ensureSchedule();
    showDetail("已排桌号", renderTablesDetail(schedule));
    return;
  }
  if (kind === "waiting") {
    const schedule = ensureSchedule();
    showDetail("暂未安排", renderWaitingDetail(schedule));
    return;
  }
  if (kind === "conflicts") {
    showDetail("关系限制", renderConflictsDetail());
    return;
  }
  if (kind === "data") {
    showDetail("数据保存", renderDataDetail());
  }
}

function showDetail(title, html) {
  elements.detailTitle.textContent = title;
  elements.detailBody.innerHTML = html;
  elements.detailModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeDetail() {
  elements.detailModal.hidden = true;
  elements.detailBody.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function stakeOptions(selected) {
  return STAKE_VALUES.map((stake) => `<option value="${stake}" ${stake === selected ? "selected" : ""}>${stakeText(stake)}</option>`).join("");
}

function playerOptions(selectedId) {
  return [
    `<option value="">空位</option>`,
    ...activePlayers().map((player) => `<option value="${player.id}" ${player.id === selectedId ? "selected" : ""}>${escapeHtml(player.name)}</option>`),
  ].join("");
}

function waitingPlayerOptions(schedule) {
  if (!schedule.waiting.length) return `<option value="">暂无待定人员</option>`;
  return [
    `<option value="">选择待定人员</option>`,
    ...schedule.waiting.map(({ player }) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`),
  ].join("");
}

function seatedPlayerOptions(schedule, currentId) {
  const options = [];
  schedule.tables.forEach((table, tableIndex) => {
    normalizedSeats(table).forEach((player, seatIndex) => {
      if (!player || player.id === currentId) return;
      options.push(
        `<option value="${player.id}">${tableIndex + 1}桌${seatIndex + 1}位 ${escapeHtml(player.name)}</option>`,
      );
    });
  });
  return options.length ? [`<option value="">选择要交换的人</option>`, ...options].join("") : `<option value="">暂无可交换人员</option>`;
}

function allPlayerOptions(selectedId) {
  return state.players.map((player) => `<option value="${player.id}" ${player.id === selectedId ? "selected" : ""}>${escapeHtml(player.name)}</option>`).join("");
}

function relationPlayerOptions(ownerId, selectedId = "") {
  const options = state.players
    .filter((player) => player.id !== ownerId)
    .map((player) => `<option value="${player.id}" ${player.id === selectedId ? "selected" : ""}>${escapeHtml(player.name)}</option>`)
    .join("");
  return options || `<option value="">没有其他玩家</option>`;
}

function stakeCheckboxes(player) {
  return STAKE_VALUES.map(
    (stake) => `
      <label>
        <input type="checkbox" name="stakes" value="${stake}" ${player.stakes.includes(stake) ? "checked" : ""} />
        ${stakeText(stake)}
      </label>
    `,
  ).join("");
}

function playerEditValues(player) {
  const draft = playerEditDrafts.get(player.id);
  if (!draft) return player;
  return {
    ...player,
    name: draft.name,
    preferred: draft.preferred,
    stakes: draft.stakes,
    active: draft.active,
  };
}

function renderAttendanceDetail() {
  const players = state.players;

  return `
    ${
      players.length
        ? `
          <div class="attendance-detail-list">
            ${players
              .map(
                (player) => `
                  <article class="attendance-detail-row ${player.active ? "attending" : ""}">
                    <label class="attendance-toggle" title="勾选今天报名">
                      <input type="checkbox" data-detail-attend="${player.id}" ${player.active ? "checked" : ""} />
                      <span class="checkmark"></span>
                    </label>
                    <div class="attendance-person">
                      <strong>${escapeHtml(player.name)}</strong>
                      <div class="detail-meta">
                        <span class="stake-pill preferred">常打${player.preferred}</span>
                        ${player.stakes.map((stake) => `<span class="stake-pill">${stakeText(stake)}</span>`).join("")}
                      </div>
                    </div>
                    <button class="secondary compact" type="button" data-edit-player="${player.id}" data-return-kind="attendance">修改</button>
                  </article>
                `,
              )
              .join("")}
          </div>
        `
        : `<div class="detail-empty">还没有添加玩家。</div>`
    }
    <form class="quick-add-player" data-quick-add-player>
      <h3>添加玩家</h3>
      <div class="quick-add-row">
        <label>
          <span>姓名</span>
          <input name="name" type="text" placeholder="输入新客人姓名" required />
        </label>
        <button class="primary" type="submit">添加</button>
      </div>
    </form>
  `;
}

function addPlayer({ name, preferred = "2", stakes = ["1", "2"], active = true }) {
  const cleanName = name.trim();
  if (!cleanName) return false;
  if (!stakes.includes(preferred)) stakes.push(preferred);

  state.players.push({
    id: nextId(),
    name: cleanName,
    preferred,
    stakes: [...new Set(stakes)].sort((a, b) => Number(a) - Number(b)),
    skill: "熟手",
    active,
  });

  clearSchedule();
  saveState();
  render();
  renderEmptyResults();
  return true;
}

function renderTablesDetail(schedule) {
  const waitingOptions = waitingPlayerOptions(schedule);

  if (!schedule.tables.length) {
    return `
      <div class="detail-tools">
        <button class="secondary" type="button" data-add-table>新增一桌</button>
      </div>
      <div class="detail-empty">今天还没有排出完整一桌。</div>
    `;
  }

  return `
    <div class="detail-tools">
      <button class="secondary" type="button" data-add-table>新增一桌</button>
    </div>
    <div class="detail-list">
      ${schedule.tables
        .map(
          (table, index) => {
            const seats = normalizedSeats(table);
            return `
            <article class="detail-table-card">
              <div class="detail-table-head">
                <strong>${index + 1} 号桌</strong>
                <label class="table-stake-edit">
                  <span>金额</span>
                  <select data-table-stake="${index}">
                    ${stakeOptions(table.stake)}
                  </select>
                </label>
              </div>
              <div class="detail-seat-list">
                ${seats
                  .map(
                    (player, seatIndex) => `
                      <div class="detail-seat">
                        <label>
                          <span>${seatIndex + 1} 号位</span>
                          <select data-seat-select data-table-index="${index}" data-seat-index="${seatIndex}">
                            ${playerOptions(player ? player.id : "")}
                          </select>
                        </label>
                        ${
                          player
                            ? `<span class="stake-pill">常打${player.preferred}</span>`
                            : `<span class="stake-pill">空位</span>`
                        }
                        <div class="seat-action-panel">
                          ${
                            player
                              ? `
                                <button class="ghost compact" type="button" data-move-seat-waiting data-table-index="${index}" data-seat-index="${seatIndex}">移到待定</button>
                                <label>
                                  <span>与桌上人员交换</span>
                                  <select data-swap-seat-select="${index}-${seatIndex}">
                                    ${seatedPlayerOptions(schedule, player.id)}
                                  </select>
                                </label>
                                <button class="secondary compact" type="button" data-swap-seat data-table-index="${index}" data-seat-index="${seatIndex}">确认交换</button>
                              `
                              : ""
                          }
                          <label>
                            <span>${player ? "从待定换入" : "从待定补入"}</span>
                            <select data-waiting-seat-select="${index}-${seatIndex}">
                              ${waitingOptions}
                            </select>
                          </label>
                          <button class="secondary compact" type="button" data-fill-seat-waiting data-table-index="${index}" data-seat-index="${seatIndex}">${player ? "换入此位" : "补入此位"}</button>
                        </div>
                      </div>
                    `,
                  )
                  .join("")}
              </div>
              <div class="table-edit-actions">
                <button class="ghost compact" type="button" data-remove-table="${index}">删除这一桌</button>
              </div>
            </article>
          `;
          },
        )
        .join("")}
    </div>
  `;
}

function renderWaitingDetail(schedule) {
  if (!schedule.waiting.length) return `<div class="detail-empty">今天所有能安排的人都已经排上桌。</div>`;

  return `
    <div class="detail-list">
      ${schedule.waiting
        .map(
          ({ player, reason }) => `
            <article class="detail-item">
              <div class="detail-item-head">
                <strong>${escapeHtml(player.name)}</strong>
                <button class="secondary compact" type="button" data-edit-player="${player.id}" data-return-kind="waiting">修改</button>
              </div>
              <div>${escapeHtml(reason)}</div>
              <div class="detail-meta">
                ${player.stakes.map((stake) => `<span class="stake-pill">${stakeText(stake)}</span>`).join("")}
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderPlayerEditor(playerId, returnKind = "attendance") {
  const player = getPlayer(playerId);
  if (!player) return `<div class="detail-empty">没有找到这个玩家。</div>`;
  const editValues = playerEditValues(player);
  const liked = state.likes.filter((rule) => rule.from === player.id);
  const disliked = state.conflicts.filter((rule) => rule.from === player.id);

  return `
    <form class="edit-form" data-player-edit-form data-player-id="${player.id}" data-return-kind="${returnKind}">
      <label>
        <span>姓名</span>
        <input name="name" type="text" value="${escapeHtml(editValues.name)}" required />
      </label>
      <label>
        <span>常打金额</span>
        <select name="preferred">${stakeOptions(editValues.preferred)}</select>
      </label>
      <fieldset>
        <legend>可接受金额</legend>
        ${stakeCheckboxes(editValues)}
      </fieldset>
      <label class="edit-check-row">
        <input name="active" type="checkbox" ${editValues.active ? "checked" : ""} />
        今天报名
      </label>
      <section class="player-relation-box">
        <h3>喜欢和谁同桌</h3>
        <div class="relation-add-row">
          <select data-add-like-select="${player.id}">${relationPlayerOptions(player.id)}</select>
          <button class="secondary compact" type="button" data-add-player-like="${player.id}">添加喜欢</button>
        </div>
        <div class="relation-chip-list">
          ${
            liked.length
              ? liked
                  .map((rule) => {
                    const to = getPlayer(rule.to);
                    if (!to) return "";
                    return `<span class="relation-chip like-chip">${escapeHtml(to.name)} <button type="button" data-delete-player-like="${player.id}" data-target-player="${to.id}">×</button></span>`;
                  })
                  .join("")
              : `<span class="relation-empty-text">暂时没有特别喜欢同桌的人</span>`
          }
        </div>
      </section>
      <section class="player-relation-box">
        <h3>不喜欢和谁同桌</h3>
        <div class="relation-add-row">
          <select data-add-dislike-select="${player.id}">${relationPlayerOptions(player.id)}</select>
          <button class="secondary compact danger-soft" type="button" data-add-player-dislike="${player.id}">添加不喜欢</button>
        </div>
        <div class="relation-chip-list">
          ${
            disliked.length
              ? disliked
                  .map((rule) => {
                    const to = getPlayer(rule.to);
                    if (!to) return "";
                    return `<span class="relation-chip dislike-chip">${escapeHtml(to.name)} <button type="button" data-delete-player-dislike="${player.id}" data-target-player="${to.id}">×</button></span>`;
                  })
                  .join("")
              : `<span class="relation-empty-text">暂时没有不喜欢同桌的人</span>`
          }
        </div>
      </section>
      <div class="edit-actions">
        <button class="primary" type="button" data-save-player-edit>保存修改</button>
        <button class="ghost" type="button" data-cancel-edit="${returnKind}">取消</button>
      </div>
    </form>
  `;
}

function renderDataDetail() {
  const backupText = backupCode();
  return `
    <section class="data-status-card">
      <h3>当前保存方式</h3>
      <p>现在不需要注册登录。玩家名单、今日报名、喜欢/不喜欢同桌、排桌结果，都会自动保存在这台手机的浏览器里。</p>
      <div class="data-facts">
        <div>
          <span>保存位置</span>
          <strong>本机浏览器</strong>
        </div>
        <div>
          <span>最后保存</span>
          <strong>${escapeHtml(formatDateTime(state.updatedAt))}</strong>
        </div>
      </div>
      <p class="data-note">换手机、清理浏览器缓存、换微信账号时，本机数据可能丢失。重要名单建议复制备份码或导出备份文件。</p>
    </section>

    <section class="data-card">
      <h3>备份当前数据</h3>
      <div class="data-actions">
        <button class="primary" type="button" data-copy-backup>复制备份码</button>
        <button class="secondary" type="button" data-download-backup>导出备份文件</button>
      </div>
      <label class="backup-code-box">
        <span>备份码</span>
        <textarea readonly>${escapeHtml(backupText)}</textarea>
      </label>
    </section>

    <section class="data-card">
      <h3>恢复数据</h3>
      <label class="backup-code-box">
        <span>粘贴备份码</span>
        <textarea data-restore-backup-code placeholder="把备份码粘贴到这里"></textarea>
      </label>
      <div class="data-actions">
        <button class="primary" type="button" data-restore-backup>恢复备份码</button>
        <label class="file-import-button">
          导入备份文件
          <input type="file" accept="application/json,.json" data-import-backup-file />
        </label>
      </div>
    </section>

    <section class="data-card">
      <h3>以后要注册登录怎么办</h3>
      <p>如果要多台手机共用同一份名单、老板和员工都能同步，就需要下一阶段接云数据库和登录系统。当前版本先保证单手机使用简单稳定。</p>
    </section>
  `;
}

function normalizedSeats(table) {
  const seats = table.group.slice(0, 4);
  while (seats.length < 4) seats.push(null);
  return seats;
}

function normalizeSchedule(schedule) {
  schedule.tables.forEach((table) => {
    table.group = normalizedSeats(table);
    if (!table.stake) table.stake = "1";
  });
}

function recalcWaitingFromSchedule(schedule) {
  const seatedIds = new Set(schedule.tables.flatMap((table) => table.group.filter(Boolean).map((player) => player.id)));
  const players = activePlayers();
  schedule.waiting = players
    .filter((player) => !seatedIds.has(player.id))
    .map((player) => ({
      player,
      reason: "暂未放入桌位，可在已排桌号里手动选择",
    }));
}

function refreshScheduleViews() {
  if (!lastSchedule) return;
  normalizeSchedule(lastSchedule);
  const activeIds = new Set(activePlayers().map((player) => player.id));
  lastSchedule.tables.forEach((table) => {
    table.group = table.group.map((player) => (player && activeIds.has(player.id) ? player : null));
  });
  recalcWaitingFromSchedule(lastSchedule);
  renderSchedule(lastSchedule);
  saveSchedule();
}

function readPlayerEditForm(form) {
  const playerId = form.dataset.playerId;
  const nameInput = form.elements.namedItem("name");
  const preferred = form.elements.namedItem("preferred").value;
  const checkedStakes = Array.from(form.querySelectorAll('input[name="stakes"]:checked')).map((input) => input.value);
  const stakes = [...new Set(checkedStakes.includes(preferred) ? checkedStakes : [...checkedStakes, preferred])].sort((a, b) => Number(a) - Number(b));
  return {
    name: (nameInput.value || "").trim(),
    preferred,
    stakes,
    active: form.elements.namedItem("active").checked,
  };
}

function rememberPlayerEditDraft(form) {
  if (!form || !form.dataset.playerId) return;
  playerEditDrafts.set(form.dataset.playerId, readPlayerEditForm(form));
}

function applyPlayerEditDraft(playerId, draft, options = {}) {
  const playerIndex = state.players.findIndex((item) => item.id === playerId);
  if (playerIndex < 0) {
    showToast("没有找到这个玩家");
    return false;
  }

  const { name, preferred, stakes, active } = draft;
  if (!name || !stakes.length) {
    showToast("姓名和可接受金额都要填写");
    return false;
  }

  const updatedPlayer = {
    ...state.players[playerIndex],
    name,
    skill: state.players[playerIndex].skill || "熟手",
    preferred,
    stakes,
    active,
  };
  state.players.splice(playerIndex, 1, updatedPlayer);

  clearSchedule();
  saveState();
  const savedAgain = readSavedPlayer(playerId);
  if (!savedAgain || savedAgain.name !== name) {
    showToast("保存没有成功，请再点一次");
    return false;
  }
  if (options.clearDraft) playerEditDrafts.delete(playerId);
  return true;
}

function applyPlayerEditFromForm(form, options = {}) {
  rememberPlayerEditDraft(form);
  const playerId = form.dataset.playerId;
  const draft = playerEditDrafts.get(playerId) || readPlayerEditForm(form);
  return applyPlayerEditDraft(playerId, draft, options);
}

function savePlayerEdit(form) {
  if (!applyPlayerEditFromForm(form, { clearDraft: true })) return;

  render();
  renderEmptyResults();
  showToast("已保存");
  openDetail(form.dataset.returnKind || "attendance");
}

function captureOpenPlayerEditor(ownerId) {
  const form = elements.detailBody.querySelector(`[data-player-edit-form][data-player-id="${ownerId}"]`);
  if (!form) {
    return {
      draft: playerEditDrafts.get(ownerId) || null,
      returnKind: "attendance",
      form: null,
    };
  }
  const draft = readPlayerEditForm(form);
  playerEditDrafts.set(ownerId, draft);
  return {
    draft,
    returnKind: form.dataset.returnKind || "attendance",
    form,
  };
}

function saveOpenPlayerEditor(ownerId) {
  const snapshot = captureOpenPlayerEditor(ownerId);
  return !snapshot.draft || applyPlayerEditDraft(ownerId, snapshot.draft);
}

function setDetailAttendance(playerId, active) {
  const player = getPlayer(playerId);
  if (!player) return;
  player.active = active;
  clearSchedule();
  saveState();
  render();
  renderEmptyResults();
  showDetail("今日报名", renderAttendanceDetail());
}

function addManualTable() {
  const schedule = ensureSchedule();
  schedule.tables.push({ group: [null, null, null, null], stake: "1", score: 0, manual: true });
  refreshScheduleViews();
  showDetail("已排桌号", renderTablesDetail(schedule));
}

function removeManualTable(index) {
  const schedule = ensureSchedule();
  schedule.tables.splice(index, 1);
  refreshScheduleViews();
  showDetail("已排桌号", renderTablesDetail(schedule));
}

function setTableStake(index, stake) {
  const schedule = ensureSchedule();
  const table = schedule.tables[index];
  if (!table) return;
  table.stake = stake;
  renderSchedule(schedule);
  saveSchedule();
  showDetail("已排桌号", renderTablesDetail(schedule));
}

function findPlayerSeat(schedule, playerId) {
  let found = null;
  schedule.tables.forEach((table, tIndex) => {
    table.group.forEach((player, sIndex) => {
      if (player && player.id === playerId) found = { table, tIndex, sIndex };
    });
  });
  return found;
}

function setTableSeat(tableIndex, seatIndex, playerId, message = "") {
  const schedule = ensureSchedule();
  normalizeSchedule(schedule);
  const targetTable = schedule.tables[tableIndex];
  if (!targetTable) return;

  const oldSeatPlayer = targetTable.group[seatIndex] || null;
  const newPlayer = playerId ? getPlayer(playerId) : null;

  if (!newPlayer) {
    targetTable.group[seatIndex] = null;
  } else {
    const existing = findPlayerSeat(schedule, newPlayer.id);

    if (existing && (existing.tIndex !== tableIndex || existing.sIndex !== seatIndex)) {
      existing.table.group[existing.sIndex] = oldSeatPlayer;
    }
    targetTable.group[seatIndex] = newPlayer;
  }

  refreshScheduleViews();
  showDetail("已排桌号", renderTablesDetail(schedule));
  if (message) showToast(message);
}

function moveSeatToWaiting(tableIndex, seatIndex) {
  setTableSeat(tableIndex, seatIndex, "", "已移到待定");
}

function fillSeatFromWaiting(tableIndex, seatIndex, playerId) {
  if (!playerId) {
    showToast("请先选择待定人员");
    return;
  }
  setTableSeat(tableIndex, seatIndex, playerId, "已换入座位");
}

function swapSeatWithPlayer(tableIndex, seatIndex, targetPlayerId) {
  if (!targetPlayerId) {
    showToast("请先选择要交换的人");
    return;
  }

  const schedule = ensureSchedule();
  normalizeSchedule(schedule);
  const targetTable = schedule.tables[tableIndex];
  const otherSeat = findPlayerSeat(schedule, targetPlayerId);
  if (!targetTable || !otherSeat) {
    showToast("没有找到要交换的人");
    return;
  }

  const currentPlayer = targetTable.group[seatIndex] || null;
  if (!currentPlayer) {
    showToast("这个座位现在是空位");
    return;
  }

  targetTable.group[seatIndex] = otherSeat.table.group[otherSeat.sIndex];
  otherSeat.table.group[otherSeat.sIndex] = currentPlayer;
  refreshScheduleViews();
  showDetail("已排桌号", renderTablesDetail(schedule));
  showToast("已交换座位");
}

function renderConflictsDetail() {
  return `
    <section class="relation-form">
      <h3>喜欢同桌</h3>
      ${
        state.likes.length
          ? `<div class="relation-chip-list">
              ${state.likes
                .map((rule) => {
                  const from = getPlayer(rule.from);
                  const to = getPlayer(rule.to);
                  if (!from || !to) return "";
                  return `<span class="relation-chip like-chip">${escapeHtml(from.name)} 喜欢 ${escapeHtml(to.name)}</span>`;
                })
                .join("")}
            </div>`
          : `<div class="relation-empty-text">还没有设置喜欢同桌的人。</div>`
      }
    </section>
    <form class="relation-form" data-conflict-form data-conflict-index="new">
      <h3>新增不愿同桌</h3>
      <div class="relation-grid">
        <label>
          <span>这个人</span>
          <select name="from">${allPlayerOptions(state.players[0]?.id || "")}</select>
        </label>
        <label>
          <span>不想和</span>
          <select name="to">${allPlayerOptions(state.players[1]?.id || state.players[0]?.id || "")}</select>
        </label>
      </div>
      <button class="secondary" type="submit">添加关系</button>
    </form>
    ${
      state.conflicts.length
        ? `
    <div class="detail-list">
      ${state.conflicts
        .map((rule, index) => {
          const from = getPlayer(rule.from);
          const to = getPlayer(rule.to);
          if (!from || !to) return "";
          return `
            <form class="relation-form" data-conflict-form data-conflict-index="${index}">
              <div class="relation-grid">
                <label>
                  <span>这个人</span>
                  <select name="from">${allPlayerOptions(from.id)}</select>
                </label>
                <label>
                  <span>不想和</span>
                  <select name="to">${allPlayerOptions(to.id)}</select>
                </label>
              </div>
              <div class="relation-actions">
                <button class="primary" type="submit">保存关系</button>
                <button class="ghost" type="button" data-delete-conflict="${index}">删除关系</button>
              </div>
            </form>
          `;
        })
        .join("")}
    </div>
        `
        : `<div class="detail-empty">还没有设置不愿同桌关系。</div>`
    }
  `;
}

function persistConflictChange(message) {
  clearSchedule();
  saveState();
  render();
  renderEmptyResults();
  showDetail("关系限制", renderConflictsDetail());
  if (message) showToast(message);
}

function saveConflictForm(form) {
  const from = form.elements.namedItem("from").value;
  const to = form.elements.namedItem("to").value;
  const rawIndex = form.dataset.conflictIndex;
  const index = rawIndex === "new" ? -1 : Number(rawIndex);

  if (!from || !to || from === to) {
    showToast("请选择两个不同的人");
    return;
  }

  const duplicated = state.conflicts.some((rule, ruleIndex) => rule.from === from && rule.to === to && ruleIndex !== index);
  if (duplicated) {
    showToast("这条关系已经存在");
    return;
  }

  if (index >= 0) {
    state.conflicts[index] = { from, to };
    persistConflictChange("已保存关系");
  } else {
    state.conflicts.push({ from, to });
    persistConflictChange("已添加关系");
  }
}

function deleteConflict(index) {
  if (!state.conflicts[index]) return;
  state.conflicts.splice(index, 1);
  persistConflictChange("已删除关系");
}

function persistPlayerRelationChange(ownerId, message, options = {}) {
  if (options.draft) playerEditDrafts.set(ownerId, options.draft);
  clearSchedule();
  saveState();
  render();
  renderEmptyResults();
  if (options.draft) playerEditDrafts.set(ownerId, options.draft);
  showDetail("修改玩家", renderPlayerEditor(ownerId, options.returnKind || "attendance"));
  if (message) showToast(message);
}

function addPlayerLike(ownerId, targetId, options = {}) {
  if (!ownerId || !targetId || ownerId === targetId) {
    showToast("请选择另一个人");
    return;
  }
  if (state.conflicts.some((rule) => rule.from === ownerId && rule.to === targetId)) {
    showToast("已经设置为不喜欢，先删除不喜欢");
    return;
  }
  if (state.likes.some((rule) => rule.from === ownerId && rule.to === targetId)) {
    showToast("已经添加过了");
    return;
  }
  state.likes.push({ from: ownerId, to: targetId });
  persistPlayerRelationChange(ownerId, "已添加喜欢", options);
}

function deletePlayerLike(ownerId, targetId, options = {}) {
  state.likes = state.likes.filter((rule) => !(rule.from === ownerId && rule.to === targetId));
  persistPlayerRelationChange(ownerId, "已删除喜欢", options);
}

function addPlayerDislike(ownerId, targetId, options = {}) {
  if (!ownerId || !targetId || ownerId === targetId) {
    showToast("请选择另一个人");
    return;
  }
  state.likes = state.likes.filter((rule) => !(rule.from === ownerId && rule.to === targetId));
  if (state.conflicts.some((rule) => rule.from === ownerId && rule.to === targetId)) {
    showToast("已经添加过了");
    return;
  }
  state.conflicts.push({ from: ownerId, to: targetId });
  persistPlayerRelationChange(ownerId, "已添加不喜欢", options);
}

function deletePlayerDislike(ownerId, targetId, options = {}) {
  state.conflicts = state.conflicts.filter((rule) => !(rule.from === ownerId && rule.to === targetId));
  persistPlayerRelationChange(ownerId, "已删除不喜欢", options);
}

function deletePlayer(id) {
  const player = getPlayer(id);
  if (!player) return;
  const ok = window.confirm(`确定删除 ${player.name} 吗？相关的不愿同桌规则也会删除。`);
  if (!ok) return;
  state.players = state.players.filter((item) => item.id !== id);
  state.conflicts = state.conflicts.filter((rule) => rule.from !== id && rule.to !== id);
  state.likes = state.likes.filter((rule) => rule.from !== id && rule.to !== id);
  clearSchedule();
  saveState();
  render();
  renderEmptyResults();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function collectFormStakes(form) {
  return Array.from(form.querySelectorAll('input[name="stakes"]:checked')).map((input) => input.value);
}

function readSavedPlayer(playerId) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return Array.isArray(saved.players) ? saved.players.find((player) => player.id === playerId) : null;
  } catch {
    return null;
  }
}

function nextId() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function scheduleText(schedule) {
  const tableLines = schedule.tables.map((table, index) => {
    const names = table.group.filter(Boolean).map((player) => player.name).join("、") || "空桌";
    return `${index + 1}号桌：${names}，${stakeText(table.stake)}`;
  });
  const waitingLines = schedule.waiting.map(({ player, reason }) => `${player.name}：${reason}`);
  return [...tableLines, "", "暂未安排：", waitingLines.length ? waitingLines.join("\n") : "暂无"].join("\n");
}

function formatDateTime(value) {
  if (!value) return "还没有保存记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "还没有保存记录";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function backupPayload() {
  return {
    app: "mahjong-arranger",
    version: 2,
    exportedAt: new Date().toISOString(),
    state,
  };
}

function backupCode() {
  return JSON.stringify(backupPayload());
}

function backupFileName() {
  const date = new Date().toISOString().slice(0, 10);
  return `麻将排桌备份-${date}.json`;
}

function downloadBackup() {
  const blob = new Blob([backupCode()], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("已生成备份文件");
}

async function copyBackup() {
  const text = backupCode();
  try {
    await navigator.clipboard.writeText(text);
    showToast("备份码已复制");
  } catch {
    showToast("复制失败，可长按备份码手动复制");
  }
}

function normalizeImportedState(raw) {
  const candidate = raw && raw.state ? raw.state : raw;
  if (!candidate || !Array.isArray(candidate.players) || !Array.isArray(candidate.conflicts)) {
    throw new Error("备份内容不正确");
  }

  const players = candidate.players
    .filter((player) => player && player.id && player.name)
    .map((player) => {
      const stakes = Array.isArray(player.stakes) && player.stakes.length ? player.stakes.map(String) : ["1", "2"];
      const preferredValue = String(player.preferred || stakes[0] || "1");
      const preferred = STAKE_VALUES.includes(preferredValue) ? preferredValue : "1";
      const cleanStakes = [...new Set(stakes.includes(preferred) ? stakes : [...stakes, preferred])].filter((stake) => STAKE_VALUES.includes(stake));
      return {
        id: String(player.id),
        name: String(player.name),
        preferred,
        stakes: cleanStakes.length ? cleanStakes : [preferred],
        skill: "熟手",
        active: Boolean(player.active),
      };
    });

  if (!players.length) throw new Error("备份里没有玩家");
  const playerIds = new Set(players.map((player) => player.id));
  const cleanRules = (rules) =>
    (Array.isArray(rules) ? rules : [])
      .filter((rule) => rule && playerIds.has(rule.from) && playerIds.has(rule.to) && rule.from !== rule.to)
      .map((rule) => ({ from: String(rule.from), to: String(rule.to) }));

  return {
    players,
    conflicts: cleanRules(candidate.conflicts),
    likes: cleanRules(candidate.likes),
    savedSchedule: candidate.savedSchedule && typeof candidate.savedSchedule === "object" ? candidate.savedSchedule : null,
    updatedAt: new Date().toISOString(),
  };
}

function restoreBackupText(text) {
  if (!text.trim()) {
    showToast("请先粘贴备份码");
    return;
  }
  try {
    const imported = normalizeImportedState(JSON.parse(text));
    state = imported;
    lastSchedule = hydrateSavedSchedule(state.savedSchedule);
    saveState();
    render();
    if (lastSchedule) {
      renderSchedule(lastSchedule);
    } else {
      renderEmptyResults();
    }
    showToast("已恢复数据");
    showDetail("数据保存", renderDataDetail());
  } catch {
    showToast("备份码不正确");
  }
}

function importBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => restoreBackupText(String(reader.result || "")));
  reader.addEventListener("error", () => showToast("备份文件读取失败"));
  reader.readAsText(file, "utf-8");
}

elements.dataManageBtn.addEventListener("click", () => openDetail("data"));

elements.arrangeBtn.addEventListener("click", () => {
  lastSchedule = arrangeTables();
  renderSchedule(lastSchedule);
  saveSchedule();
});

elements.summaryCards.forEach((card) => {
  card.addEventListener("click", () => openDetail(card.dataset.detail));
});

elements.detailCloseButtons.forEach((button) => {
  button.addEventListener("click", closeDetail);
});

elements.detailBody.addEventListener(
  "pointerdown",
  (event) => {
    const relationButton = event.target.closest(
      "[data-add-player-like], [data-add-player-dislike], [data-delete-player-like], [data-delete-player-dislike], [data-save-player-edit]",
    );
    if (!relationButton) return;
    const form = relationButton.closest("[data-player-edit-form]");
    if (form) rememberPlayerEditDraft(form);
  },
  true,
);

elements.detailBody.addEventListener("click", (event) => {
  if (event.target.closest("[data-copy-backup]")) {
    copyBackup();
    return;
  }

  if (event.target.closest("[data-download-backup]")) {
    downloadBackup();
    return;
  }

  if (event.target.closest("[data-restore-backup]")) {
    const textarea = elements.detailBody.querySelector("[data-restore-backup-code]");
    restoreBackupText(textarea ? textarea.value : "");
    return;
  }

  const editButton = event.target.closest("[data-edit-player]");
  if (editButton) {
    showDetail("修改玩家", renderPlayerEditor(editButton.dataset.editPlayer, editButton.dataset.returnKind));
    return;
  }

  const cancelButton = event.target.closest("[data-cancel-edit]");
  if (cancelButton) {
    const form = cancelButton.closest("[data-player-edit-form]");
    if (form) playerEditDrafts.delete(form.dataset.playerId);
    openDetail(cancelButton.dataset.cancelEdit || "attendance");
    return;
  }

  if (event.target.closest("[data-add-table]")) {
    addManualTable();
    return;
  }

  const removeButton = event.target.closest("[data-remove-table]");
  if (removeButton) {
    removeManualTable(Number(removeButton.dataset.removeTable));
    return;
  }

  const deleteConflictButton = event.target.closest("[data-delete-conflict]");
  if (deleteConflictButton) {
    deleteConflict(Number(deleteConflictButton.dataset.deleteConflict));
    return;
  }

  const moveSeatButton = event.target.closest("[data-move-seat-waiting]");
  if (moveSeatButton) {
    moveSeatToWaiting(Number(moveSeatButton.dataset.tableIndex), Number(moveSeatButton.dataset.seatIndex));
    return;
  }

  const fillSeatButton = event.target.closest("[data-fill-seat-waiting]");
  if (fillSeatButton) {
    const tableIndex = Number(fillSeatButton.dataset.tableIndex);
    const seatIndex = Number(fillSeatButton.dataset.seatIndex);
    const select = elements.detailBody.querySelector(`[data-waiting-seat-select="${tableIndex}-${seatIndex}"]`);
    fillSeatFromWaiting(tableIndex, seatIndex, select ? select.value : "");
    return;
  }

  const swapSeatButton = event.target.closest("[data-swap-seat]");
  if (swapSeatButton) {
    const tableIndex = Number(swapSeatButton.dataset.tableIndex);
    const seatIndex = Number(swapSeatButton.dataset.seatIndex);
    const select = elements.detailBody.querySelector(`[data-swap-seat-select="${tableIndex}-${seatIndex}"]`);
    swapSeatWithPlayer(tableIndex, seatIndex, select ? select.value : "");
    return;
  }

  const addLikeButton = event.target.closest("[data-add-player-like]");
  if (addLikeButton) {
    const ownerId = addLikeButton.dataset.addPlayerLike;
    const snapshot = captureOpenPlayerEditor(ownerId);
    if (snapshot.draft && !applyPlayerEditDraft(ownerId, snapshot.draft)) return;
    const select = elements.detailBody.querySelector(`[data-add-like-select="${ownerId}"]`);
    addPlayerLike(ownerId, select ? select.value : "", snapshot);
    return;
  }

  const addDislikeButton = event.target.closest("[data-add-player-dislike]");
  if (addDislikeButton) {
    const ownerId = addDislikeButton.dataset.addPlayerDislike;
    const snapshot = captureOpenPlayerEditor(ownerId);
    if (snapshot.draft && !applyPlayerEditDraft(ownerId, snapshot.draft)) return;
    const select = elements.detailBody.querySelector(`[data-add-dislike-select="${ownerId}"]`);
    addPlayerDislike(ownerId, select ? select.value : "", snapshot);
    return;
  }

  const deleteLikeButton = event.target.closest("[data-delete-player-like]");
  if (deleteLikeButton) {
    const ownerId = deleteLikeButton.dataset.deletePlayerLike;
    const snapshot = captureOpenPlayerEditor(ownerId);
    if (snapshot.draft && !applyPlayerEditDraft(ownerId, snapshot.draft)) return;
    deletePlayerLike(ownerId, deleteLikeButton.dataset.targetPlayer, snapshot);
    return;
  }

  const deleteDislikeButton = event.target.closest("[data-delete-player-dislike]");
  if (deleteDislikeButton) {
    const ownerId = deleteDislikeButton.dataset.deletePlayerDislike;
    const snapshot = captureOpenPlayerEditor(ownerId);
    if (snapshot.draft && !applyPlayerEditDraft(ownerId, snapshot.draft)) return;
    deletePlayerDislike(ownerId, deleteDislikeButton.dataset.targetPlayer, snapshot);
    return;
  }

  const savePlayerButton = event.target.closest("[data-save-player-edit]");
  if (savePlayerButton) {
    const form = savePlayerButton.closest("[data-player-edit-form]");
    if (form) savePlayerEdit(form);
  }
});

elements.detailBody.addEventListener("change", (event) => {
  const editForm = event.target.closest("[data-player-edit-form]");
  if (editForm) rememberPlayerEditDraft(editForm);

  const backupFile = event.target.closest("[data-import-backup-file]");
  if (backupFile) {
    importBackupFile(backupFile.files && backupFile.files[0]);
    backupFile.value = "";
    return;
  }

  const detailAttend = event.target.closest("[data-detail-attend]");
  if (detailAttend) {
    setDetailAttendance(detailAttend.dataset.detailAttend, detailAttend.checked);
    return;
  }

  const tableStake = event.target.closest("[data-table-stake]");
  if (tableStake) {
    setTableStake(Number(tableStake.dataset.tableStake), tableStake.value);
    return;
  }

  const seatSelect = event.target.closest("[data-seat-select]");
  if (seatSelect) {
    setTableSeat(Number(seatSelect.dataset.tableIndex), Number(seatSelect.dataset.seatIndex), seatSelect.value);
  }
});

elements.detailBody.addEventListener("input", (event) => {
  const form = event.target.closest("[data-player-edit-form]");
  if (form) rememberPlayerEditDraft(form);
});

elements.detailBody.addEventListener("submit", (event) => {
  const quickAddForm = event.target.closest("[data-quick-add-player]");
  if (quickAddForm) {
    event.preventDefault();
    const name = quickAddForm.elements.namedItem("name").value;
    if (addPlayer({ name })) {
      showToast("已添加玩家");
      showDetail("今日报名", renderAttendanceDetail());
    }
    return;
  }

  const form = event.target.closest("[data-player-edit-form]");
  if (form) {
    event.preventDefault();
    savePlayerEdit(form);
    return;
  }

  const conflictForm = event.target.closest("[data-conflict-form]");
  if (conflictForm) {
    event.preventDefault();
    saveConflictForm(conflictForm);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.detailModal.hidden) closeDetail();
});

elements.copyBtn.addEventListener("click", async () => {
  if (!lastSchedule) return;
  const text = scheduleText(lastSchedule);
  try {
    await navigator.clipboard.writeText(text);
    showToast("已复制排桌结果");
  } catch {
    showToast("复制失败，可手动选中文字");
  }
});

elements.toggleAllBtn.addEventListener("click", () => {
  const shouldAttend = activePlayers().length !== state.players.length;
  state.players.forEach((player) => {
    player.active = shouldAttend;
  });
  clearSchedule();
  saveState();
  render();
  renderEmptyResults();
});

elements.resetSampleBtn.addEventListener("click", () => {
  const ok = window.confirm("确定恢复示例数据吗？当前修改会被覆盖。");
  if (!ok) return;
  state = structuredClone(sampleState);
  clearSchedule();
  saveState();
  render();
  renderEmptyResults();
});

elements.stakeFilter.addEventListener("change", renderPlayers);

elements.playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.elements.namedItem("name").value.trim();
  const stakes = collectFormStakes(form);
  const preferred = form.elements.namedItem("preferred").value;

  if (!name || !stakes.length) return;
  if (addPlayer({ name, preferred, stakes })) form.reset();
});

elements.preferredInput.addEventListener("change", () => {
  const preferred = elements.preferredInput.value;
  const checkbox = elements.playerForm.querySelector(`input[name="stakes"][value="${preferred}"]`);
  if (checkbox) checkbox.checked = true;
});

elements.addConflictBtn.addEventListener("click", () => {
  const from = elements.fromPlayer.value;
  const to = elements.toPlayer.value;
  if (!from || !to || from === to) {
    showToast("请选择两个不同玩家");
    return;
  }
  const exists = state.conflicts.some((rule) => rule.from === from && rule.to === to);
  if (exists) {
    showToast("这条关系已经存在");
    return;
  }
  state.conflicts.push({ from, to });
  clearSchedule();
  saveState();
  render();
  renderEmptyResults();
});

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "copy-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1700);
}

render();
if (lastSchedule) {
  renderSchedule(lastSchedule);
} else {
  renderEmptyResults();
}
