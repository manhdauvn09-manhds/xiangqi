/**
 * chess-mini.js — Minimal Western Chess Engine for Daily Puzzles
 * Handles: FEN parsing, SAN parsing, move application, piece finding
 */

export const PIECE_SYMBOLS = {
  'K':'♔','Q':'♕','R':'♖','B':'♗','N':'♘','P':'♙',
  'k':'♚','q':'♛','r':'♜','b':'♝','n':'♞','p':'♟'
};

/** Parse FEN string → position object */
export function parseFen(fen) {
  const parts = fen.split(' ');
  const rows = parts[0].split('/');
  const board = [];
  for (let r = 0; r < 8; r++) {
    board[r] = [];
    let f = 0;
    for (const ch of rows[r]) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < +ch; i++) board[r][f++] = null;
      } else {
        board[r][f++] = ch;
      }
    }
  }
  return {
    board,
    turn:      parts[1] || 'w',
    castling:  parts[2] || '-',
    enPassant: parts[3] || '-',
  };
}

/** 'e4' → { file:4, rank:4 } (rank 0 = top = rank-8) */
export function sqToCoord(sq) {
  return { file: sq.charCodeAt(0) - 97, rank: 8 - parseInt(sq[1]) };
}

/** {file,rank} → 'e4' */
export function coordToSq(file, rank) {
  return String.fromCharCode(97 + file) + (8 - rank);
}

/**
 * Parse SAN → { piece, fromFile, fromRank, toFile, toRank, promotion }
 * fromFile/fromRank = -1 means "any"
 */
export function parseSan(san, turn) {
  san = san.replace(/[+#!?]/g, '');

  // Castling
  if (san === 'O-O' || san === '0-0') {
    const r = turn === 'w' ? 7 : 0;
    return { piece:'K', fromFile:4, fromRank:r, toFile:6, toRank:r, promotion:null };
  }
  if (san === 'O-O-O' || san === '0-0-0') {
    const r = turn === 'w' ? 7 : 0;
    return { piece:'K', fromFile:4, fromRank:r, toFile:2, toRank:r, promotion:null };
  }

  let piece = 'P', fromFile = -1, fromRank = -1, promotion = null;
  let s = san;

  // Piece
  if ('KQRBN'.includes(s[0])) { piece = s[0]; s = s.slice(1); }

  // Promotion
  const promIdx = s.indexOf('=');
  if (promIdx !== -1) { promotion = s[promIdx + 1]; s = s.slice(0, promIdx); }

  // Remove capture
  s = s.replace('x', '');

  // Destination is last 2 chars
  const to = s.slice(-2);
  const { file: toFile, rank: toRank } = sqToCoord(to);
  const disambig = s.slice(0, -2);

  if (disambig.length === 1) {
    if ('abcdefgh'.includes(disambig)) fromFile = disambig.charCodeAt(0) - 97;
    else if ('12345678'.includes(disambig)) fromRank = 8 - parseInt(disambig);
  } else if (disambig.length === 2) {
    fromFile = disambig.charCodeAt(0) - 97;
    fromRank = 8 - parseInt(disambig[1]);
  }

  return { piece, fromFile, fromRank, toFile, toRank, promotion };
}

/**
 * Find from-square of a SAN move in the current position.
 * Returns { file, rank } or null.
 */
export function findFromSquare(san, pos) {
  const { piece, fromFile, fromRank, toFile, toRank } = parseSan(san, pos.turn);
  const { board, turn } = pos;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      if (p.toUpperCase() !== piece) continue;
      if (turn === 'w' && p === p.toLowerCase()) continue;
      if (turn === 'b' && p === p.toUpperCase()) continue;
      if (fromFile !== -1 && f !== fromFile) continue;
      if (fromRank !== -1 && r !== fromRank) continue;
      // Basic reachability check for disambiguation
      if (canReach(p, f, r, toFile, toRank, board)) return { file: f, rank: r };
    }
  }
  return null;
}

/** Basic reachability (not full legality, but enough for puzzle disambiguation) */
function canReach(piece, ff, fr, tf, tr, board) {
  const p = piece.toUpperCase();
  const df = tf - ff, dr = tr - fr;
  const adf = Math.abs(df), adr = Math.abs(dr);

  if (p === 'K') return adf <= 1 && adr <= 1;
  if (p === 'N') return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
  if (p === 'P') {
    const dir = piece === piece.toUpperCase() ? -1 : 1; // white goes up (rank decreases)
    if (df === 0) return dr === dir || (dr === 2 * dir && fr === (piece === piece.toUpperCase() ? 6 : 1));
    return adf === 1 && dr === dir; // capture
  }
  if (p === 'B') return adf === adr && isPathClear(ff, fr, tf, tr, board);
  if (p === 'R') return (df === 0 || dr === 0) && isPathClear(ff, fr, tf, tr, board);
  if (p === 'Q') {
    return ((adf === adr) || df === 0 || dr === 0) && isPathClear(ff, fr, tf, tr, board);
  }
  return true;
}

function isPathClear(ff, fr, tf, tr, board) {
  const sf = Math.sign(tf - ff), sr = Math.sign(tr - fr);
  let f = ff + sf, r = fr + sr;
  while (f !== tf || r !== tr) {
    if (board[r][f]) return false;
    f += sf; r += sr;
  }
  return true;
}

/**
 * Apply a SAN move to a position → new position.
 */
export function applyMoveSan(san, pos) {
  const { toFile, toRank, promotion } = parseSan(san, pos.turn);
  const from = findFromSquare(san, pos);
  if (!from) return pos;

  const nb = pos.board.map(row => [...row]);
  const piece = nb[from.rank][from.file];
  nb[from.rank][from.file] = null;

  // En passant capture
  if (piece.toUpperCase() === 'P' && from.file !== toFile && !pos.board[toRank][toFile]) {
    nb[from.rank][toFile] = null;
  }
  // Castling — move rook
  if (piece.toUpperCase() === 'K' && Math.abs(toFile - from.file) === 2) {
    if (toFile === 6) { nb[from.rank][5] = nb[from.rank][7]; nb[from.rank][7] = null; }
    else              { nb[from.rank][3] = nb[from.rank][0]; nb[from.rank][0] = null; }
  }

  nb[toRank][toFile] = promotion
    ? (pos.turn === 'w' ? promotion : promotion.toLowerCase())
    : piece;

  // En passant target
  let newEp = '-';
  if (piece.toUpperCase() === 'P' && Math.abs(toRank - from.rank) === 2) {
    newEp = coordToSq(toFile, (from.rank + toRank) / 2);
  }

  return { ...pos, board: nb, turn: pos.turn === 'w' ? 'b' : 'w', enPassant: newEp };
}

/**
 * Check if user's move (fromCoord, toCoord) matches the expected SAN move.
 */
export function checkUserMove(fromCoord, toCoord, san, pos) {
  const { toFile, toRank } = parseSan(san, pos.turn);
  const expectedFrom = findFromSquare(san, pos);
  if (!expectedFrom) return false;
  return fromCoord.file === expectedFrom.file &&
         fromCoord.rank === expectedFrom.rank &&
         toCoord.file  === toFile &&
         toCoord.rank  === toRank;
}

/** Get the squares involved in a SAN move: { from, to } as 'e2', 'e4' strings */
export function getMoveSquares(san, pos) {
  const { toFile, toRank } = parseSan(san, pos.turn);
  const from = findFromSquare(san, pos);
  if (!from) return null;
  return { from: coordToSq(from.file, from.rank), to: coordToSq(toFile, toRank) };
}

/** Get all squares of pieces belonging to the current side to move */
export function getMovablePieces(pos) {
  const squares = [];
  const { board, turn } = pos;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      if (turn === 'w' && p === p.toUpperCase()) squares.push(coordToSq(f, r));
      if (turn === 'b' && p === p.toLowerCase()) squares.push(coordToSq(f, r));
    }
  }
  return squares;
}
