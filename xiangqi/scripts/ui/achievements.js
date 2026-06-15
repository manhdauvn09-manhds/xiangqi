// Cờ Tướng Vương — Achievement system (frontend-only, đọc từ localStorage)
import { getProfile, listGames } from '../storage/local.js';

export const ACHIEVEMENTS = [
  {
    id: 'first_blood',
    icon: '⚔️',
    title: 'Chiến Thắng Đầu Tiên',
    desc: 'Thắng ván đầu tiên',
    check: (p) => p.wins >= 1,
  },
  {
    id: 'veteran',
    icon: '🎖️',
    title: 'Lính Chiến',
    desc: 'Hoàn thành 20 ván đấu',
    check: (p) => p.gamesPlayed >= 20,
  },
  {
    id: 'centurion',
    icon: '💯',
    title: 'Trăm Trận',
    desc: 'Hoàn thành 100 ván đấu',
    check: (p) => p.gamesPlayed >= 100,
  },
  {
    id: 'elo_1400',
    icon: '🥈',
    title: 'Bạc Cương',
    desc: 'Đạt ELO 1400',
    check: (p) => p.elo >= 1400,
  },
  {
    id: 'elo_1600',
    icon: '🥇',
    title: 'Hoàng Kim',
    desc: 'Đạt ELO 1600',
    check: (p) => p.elo >= 1600,
  },
  {
    id: 'elo_1800',
    icon: '💎',
    title: 'Bạch Kim',
    desc: 'Đạt ELO 1800',
    check: (p) => p.elo >= 1800,
  },
  {
    id: 'elo_2000',
    icon: '🛡️',
    title: 'Cao Thủ',
    desc: 'Đạt ELO 2000',
    check: (p) => p.elo >= 2000,
  },
  {
    id: 'sharp_mind',
    icon: '🧩',
    title: 'Trí Tuệ Sắc Bén',
    desc: 'Giải 3 Daily Puzzle khác nhau',
    check: () => {
      try {
        const streak = JSON.parse(localStorage.getItem('xq_daily_streak') || '{}');
        return Object.values(streak).filter(v => v === 'solved').length >= 3;
      } catch { return false; }
    },
  },
  {
    id: 'streak_7',
    icon: '🔥',
    title: 'Lửa Không Tắt',
    desc: 'Giải Daily Puzzle 7 ngày liên tiếp',
    check: () => {
      try {
        const streak = JSON.parse(localStorage.getItem('xq_daily_streak') || '{}');
        let count = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          if (streak[key] === 'solved') count++;
          else break;
        }
        return count >= 7;
      } catch { return false; }
    },
  },
  {
    id: 'bot_slayer',
    icon: '🤖',
    title: 'Kẻ Diệt Bot',
    desc: 'Thắng 5 ván với Bot cấp 10',
    check: (_, games) => games.filter(g => g.mode === 'bot' && g.botLevel >= 10 &&
      ((g.result==='1-0' && g.userSide==='r') || (g.result==='0-1' && g.userSide==='b'))
    ).length >= 5,
  },
  {
    id: 'win_streak_5',
    icon: '🔴',
    title: 'Chuỗi Đỏ',
    desc: 'Thắng 5 ván liên tiếp',
    check: (_, games) => {
      let streak = 0;
      for (const g of games) {
        const won = (g.result==='1-0' && g.userSide==='r') || (g.result==='0-1' && g.userSide==='b');
        if (won) { streak++; if (streak >= 5) return true; }
        else streak = 0;
      }
      return false;
    },
  },
  {
    id: 'undefeated_10',
    icon: '🏯',
    title: 'Bất Bại',
    desc: 'Không thua trong 10 ván liên tiếp',
    check: (_, games) => {
      let streak = 0;
      for (const g of games) {
        const lost = (g.result==='0-1' && g.userSide==='r') || (g.result==='1-0' && g.userSide==='b');
        if (!lost) { streak++; if (streak >= 10) return true; }
        else streak = 0;
      }
      return false;
    },
  },
];

/** Trả về danh sách achievements với trạng thái earned=true/false */
export function getAchievements() {
  const profile = getProfile();
  const games   = listGames(200);
  return ACHIEVEMENTS.map(a => ({
    ...a,
    earned: !!a.check(profile, games),
  }));
}

/** Kiểm tra achievement nào mới được mở sau 1 hành động, trả về list mới earned */
export function checkNewAchievements() {
  const key = 'xq_achievements_seen';
  const seen = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  const all  = getAchievements();
  const newOnes = all.filter(a => a.earned && !seen.has(a.id));
  if (newOnes.length) {
    newOnes.forEach(a => seen.add(a.id));
    localStorage.setItem(key, JSON.stringify([...seen]));
  }
  return newOnes;
}
