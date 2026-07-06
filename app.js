const STORAGE_KEY = "mahjong-arranger-v1";
const STAKE_VALUES = ["1", "2", "3", "4"];
const SKILL_VALUES = ["新手", "熟手", "高手"];

const skillScore = {
  "新手": 1,
  "熟手": 2,
  "高手": 3,
};

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
};

let state = loadState();
let lastSchedule = hydrateSavedSchedule(state.savedSchedule);

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
  skillFilter: document.querySelector("#skillFilter"),
  toggleAllBtn: document.querySelector("#toggleAllBtn"),
  arrangeBtn: document.querySelector("#arrangeBtn"),
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
    return parsed;
  } catch {
    return structuredClone(sampleState);
  }
}

function saveState() {
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

function skillClass(skill) {
  if (skill === "新手") return "skill-new";
  if (skill === "高手") return "skill-pro";
  return "";
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

function pairLikeCount(a, b) {
  return Number(directedLike(a, b)) + Number(directedLike(b, a));
}

function hasBlockedPair(group) {
  for (let i = 0; i < group.length; i += 1) {
    for (let j = i + 1; j < group.length; j += 1) {
      if (pairBlocked(group[i], group[j])) return true;
    }
  }
  return false;
}

function commonStakes(group) {
  const [first, ...rest] = group;
  return first.stakes.filter((stake) => rest.every((player) => player.stakes.includes(stake)));
}

function chooseStake(group, options) {
  return options
    .map((stake) => ({
      stake,
      preferredHits: group.filter((player) => player.preferred === stake).length,
      flexibility: group.reduce((sum, player) => sum + player.stakes.length, 0),
    }))
    .sort((a, b) => b.preferredHits - a.preferredHits || Number(b.stake) - Number(a.stake) || a.flexibility - b.flexibility)[0].stake;
}

function scoreGroup(group, chosenStake) {
  const skills = group.map((player) => skillScore[player.skill]);
  const spread = Math.max(...skills) - Math.min(...skills);
  const preferredHits = group.filter((player) => player.preferred === chosenStake).length;
  const sameSkillPairs = group.filter((player) => player.skill === group[0].skill).length;
  let likeScore = 0;
  for (let i = 0; i < group.length; i += 1) {
    for (let j = i + 1; j < group.length; j += 1) {
      likeScore += pairLikeCount(group[i], group[j]);
    }
  }
  return preferredHits * 28 + (2 - spread) * 18 + sameSkillPairs * 4 + likeScore * 16;
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
      if (!options.length || hasBlockedPair(group)) return null;
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
  const compatible = others.filter((other) => !pairBlocked(player, other));
  const sameStake = compatible.filter((other) => other.stakes.some((stake) => player.stakes.includes(stake)));
  if (sameStake.length < 3) {
    return `能匹配同一金额的人不足 3 位`;
  }
  const blockedNames = others.filter((other) => pairBlocked(player, other)).map((other) => other.name);
  if (blockedNames.length) {
    return `有不愿同桌限制：${blockedNames.slice(0, 3).join("、")}`;
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
  const skillFilter = elements.skillFilter.value;
  elements.playerList.innerHTML = "";

  const players = state.players.filter((player) => {
    const stakeOk = stakeFilter === "all" || player.stakes.includes(stakeFilter);
    const skillOk = skillFilter === "all" || player.skill === skillFilter;
    return stakeOk && skillOk;
  });

  players.forEach((player) => {
    const node = elements.playerTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = node.querySelector(".attend-check");
    const name = node.querySelector("strong");
    const skill = node.querySelector(".skill-pill");
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
    skill.textContent = player.skill;
    const extraSkillClass = skillClass(player.skill);
    if (extraSkillClass) skill.classList.add(extraSkillClass);

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
                  <span class="skill-pill ${skillClass(player.skill)}">${player.skill}</span>
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

function skillOptions(selected) {
  return SKILL_VALUES.map((skill) => `<option value="${skill}" ${skill === selected ? "selected" : ""}>${skill}</option>`).join("");
}

function playerOptions(selectedId) {
  return [
    `<option value="">空位</option>`,
    ...activePlayers().map((player) => `<option value="${player.id}" ${player.id === selectedId ? "selected" : ""}>${escapeHtml(player.name)}</option>`),
  ].join("");
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
                        <span class="skill-pill ${skillClass(player.skill)}">${player.skill}</span>
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

function addPlayer({ name, preferred = "2", stakes = ["1", "2"], skill = "熟手", active = true }) {
  const cleanName = name.trim();
  if (!cleanName) return false;
  if (!stakes.includes(preferred)) stakes.push(preferred);

  state.players.push({
    id: nextId(),
    name: cleanName,
    preferred,
    stakes: [...new Set(stakes)].sort((a, b) => Number(a) - Number(b)),
    skill,
    active,
  });

  clearSchedule();
  saveState();
  render();
  renderEmptyResults();
  return true;
}

function renderTablesDetail(schedule) {
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
                            ? `<span class="skill-pill ${skillClass(player.skill)}">${player.skill}</span>`
                            : `<span class="stake-pill">空位</span>`
                        }
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
                <span class="skill-pill ${skillClass(player.skill)}">${player.skill}</span>
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
  const liked = state.likes.filter((rule) => rule.from === player.id);
  const disliked = state.conflicts.filter((rule) => rule.from === player.id);

  return `
    <form class="edit-form" data-player-edit-form data-player-id="${player.id}" data-return-kind="${returnKind}">
      <label>
        <span>姓名</span>
        <input name="name" type="text" value="${escapeHtml(player.name)}" required />
      </label>
      <label>
        <span>水平</span>
        <select name="skill">${skillOptions(player.skill)}</select>
      </label>
      <label>
        <span>常打金额</span>
        <select name="preferred">${stakeOptions(player.preferred)}</select>
      </label>
      <fieldset>
        <legend>可接受金额</legend>
        ${stakeCheckboxes(player)}
      </fieldset>
      <label class="edit-check-row">
        <input name="active" type="checkbox" ${player.active ? "checked" : ""} />
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
        <button class="primary" type="submit">保存修改</button>
        <button class="ghost" type="button" data-cancel-edit="${returnKind}">取消</button>
      </div>
    </form>
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

function savePlayerEdit(form) {
  const player = getPlayer(form.dataset.playerId);
  if (!player) return;

  const name = form.elements.namedItem("name").value.trim();
  const stakes = Array.from(form.querySelectorAll('input[name="stakes"]:checked')).map((input) => input.value);
  const preferred = form.elements.namedItem("preferred").value;
  if (!name || !stakes.length) {
    showToast("姓名和可接受金额都要填写");
    return;
  }

  player.name = name;
  player.skill = form.elements.namedItem("skill").value;
  player.preferred = preferred;
  player.stakes = [...new Set(stakes.includes(preferred) ? stakes : [...stakes, preferred])].sort((a, b) => Number(a) - Number(b));
  player.active = form.elements.namedItem("active").checked;

  saveState();
  render();
  refreshScheduleViews();
  showToast("已保存");
  openDetail(form.dataset.returnKind || "attendance");
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

function setTableSeat(tableIndex, seatIndex, playerId) {
  const schedule = ensureSchedule();
  normalizeSchedule(schedule);
  const targetTable = schedule.tables[tableIndex];
  if (!targetTable) return;

  const oldSeatPlayer = targetTable.group[seatIndex] || null;
  const newPlayer = playerId ? getPlayer(playerId) : null;

  if (!newPlayer) {
    targetTable.group[seatIndex] = null;
  } else {
    let existing = null;
    schedule.tables.forEach((table, tIndex) => {
      table.group.forEach((player, sIndex) => {
        if (player && player.id === newPlayer.id) existing = { table, tIndex, sIndex };
      });
    });

    if (existing && (existing.tIndex !== tableIndex || existing.sIndex !== seatIndex)) {
      existing.table.group[existing.sIndex] = oldSeatPlayer;
    }
    targetTable.group[seatIndex] = newPlayer;
  }

  refreshScheduleViews();
  showDetail("已排桌号", renderTablesDetail(schedule));
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

function persistPlayerRelationChange(ownerId, message) {
  clearSchedule();
  saveState();
  render();
  renderEmptyResults();
  showDetail("修改玩家", renderPlayerEditor(ownerId, "attendance"));
  if (message) showToast(message);
}

function addPlayerLike(ownerId, targetId) {
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
  persistPlayerRelationChange(ownerId, "已添加喜欢");
}

function deletePlayerLike(ownerId, targetId) {
  state.likes = state.likes.filter((rule) => !(rule.from === ownerId && rule.to === targetId));
  persistPlayerRelationChange(ownerId, "已删除喜欢");
}

function addPlayerDislike(ownerId, targetId) {
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
  persistPlayerRelationChange(ownerId, "已添加不喜欢");
}

function deletePlayerDislike(ownerId, targetId) {
  state.conflicts = state.conflicts.filter((rule) => !(rule.from === ownerId && rule.to === targetId));
  persistPlayerRelationChange(ownerId, "已删除不喜欢");
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

elements.detailBody.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-player]");
  if (editButton) {
    showDetail("修改玩家", renderPlayerEditor(editButton.dataset.editPlayer, editButton.dataset.returnKind));
    return;
  }

  const cancelButton = event.target.closest("[data-cancel-edit]");
  if (cancelButton) {
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

  const addLikeButton = event.target.closest("[data-add-player-like]");
  if (addLikeButton) {
    const ownerId = addLikeButton.dataset.addPlayerLike;
    const select = elements.detailBody.querySelector(`[data-add-like-select="${ownerId}"]`);
    addPlayerLike(ownerId, select ? select.value : "");
    return;
  }

  const addDislikeButton = event.target.closest("[data-add-player-dislike]");
  if (addDislikeButton) {
    const ownerId = addDislikeButton.dataset.addPlayerDislike;
    const select = elements.detailBody.querySelector(`[data-add-dislike-select="${ownerId}"]`);
    addPlayerDislike(ownerId, select ? select.value : "");
    return;
  }

  const deleteLikeButton = event.target.closest("[data-delete-player-like]");
  if (deleteLikeButton) {
    deletePlayerLike(deleteLikeButton.dataset.deletePlayerLike, deleteLikeButton.dataset.targetPlayer);
    return;
  }

  const deleteDislikeButton = event.target.closest("[data-delete-player-dislike]");
  if (deleteDislikeButton) {
    deletePlayerDislike(deleteDislikeButton.dataset.deletePlayerDislike, deleteDislikeButton.dataset.targetPlayer);
  }
});

elements.detailBody.addEventListener("change", (event) => {
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
elements.skillFilter.addEventListener("change", renderPlayers);

elements.playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.elements.namedItem("name").value.trim();
  const stakes = collectFormStakes(form);
  const preferred = form.elements.namedItem("preferred").value;
  const skill = form.elements.namedItem("skill").value;

  if (!name || !stakes.length) return;
  if (addPlayer({ name, preferred, stakes, skill })) form.reset();
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
