export const DEVELOPER_SIGNALS = {
  facebookPage: 'https://facebook.com/yourpage',
  facebookGroup: 'https://facebook.com/groups/yourgroup',
  signalVersion: 'v2.4.0-STABLE',
  networkStatus: 'ENCRYPTED',
};

export type PlayerRank = {
  name: string;
  minReputation: number;
  minTrades: number;
  color: string;
  badge: string;
};

export const PLAYER_RANKS: PlayerRank[] = [
  { name: 'RECRUIT', minReputation: 0, minTrades: 0, color: 'text-slate-500', badge: 'bg-slate-500' },
  { name: 'SHADOW TRADER', minReputation: 3.5, minTrades: 5, color: 'text-cyan-500', badge: 'bg-cyan-500' },
  { name: 'PHANTOM MERCHANT', minReputation: 4.2, minTrades: 15, color: 'text-indigo-500', badge: 'bg-indigo-500' },
  { name: 'NEON LEGEND', minReputation: 4.8, minTrades: 50, color: 'text-amber-500', badge: 'bg-amber-500' },
];

export const getPlayerRank = (reputation: number, completedTrades: number): PlayerRank => {
  return [...PLAYER_RANKS].reverse().find(rank => 
    reputation >= rank.minReputation && completedTrades >= rank.minTrades
  ) || PLAYER_RANKS[0];
};
