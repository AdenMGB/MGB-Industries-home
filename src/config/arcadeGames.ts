export interface ArcadeGame {
  id: string
  name: string
  description: string
  tags: string[]
  color: string
  textColor: string
  emoji: string
  highScoreKey: string
  controls: string
  section: 'Arcade'
}

export const ARCADE_GAMES: ArcadeGame[] = [
  {
    id: 'arcade-snake',
    name: 'Snake',
    description: 'Classic snake — eat, grow, and avoid your own tail.',
    tags: ['Classic', 'Keyboard'],
    color: '#A8E6CF',
    textColor: '#004D40',
    emoji: '🐍',
    highScoreKey: 'highScore',
    controls: '← → ↑ ↓ / WASD',
    section: 'Arcade',
  },
  {
    id: 'arcade-breakout',
    name: 'Breakout',
    description: 'Smash all the bricks before you run out of balls.',
    tags: ['Classic', 'Mouse'],
    color: '#FFB5A7',
    textColor: '#8B4513',
    emoji: '🧱',
    highScoreKey: 'highScore',
    controls: 'Mouse / ← →',
    section: 'Arcade',
  },
  {
    id: 'arcade-memory',
    name: 'Memory Match',
    description: 'Flip cards and match every pair as fast as you can.',
    tags: ['Puzzle', 'Mouse'],
    color: '#C8A8E9',
    textColor: '#4A148C',
    emoji: '🃏',
    highScoreKey: 'bestTime',
    controls: 'Click',
    section: 'Arcade',
  },
  {
    id: 'arcade-pong',
    name: 'Pong',
    description: 'One-player Pong — keep the ball alive as long as possible.',
    tags: ['Classic', 'Mouse'],
    color: '#B5E5E8',
    textColor: '#01579B',
    emoji: '🏓',
    highScoreKey: 'highScore',
    controls: 'Mouse / ↑ ↓',
    section: 'Arcade',
  },
  {
    id: 'arcade-whack',
    name: 'Whack-a-Mole',
    description: 'Tap every mole before it hides — speed increases each wave.',
    tags: ['Arcade', 'Mouse'],
    color: '#FFD3A5',
    textColor: '#E65100',
    emoji: '🔨',
    highScoreKey: 'highScore',
    controls: 'Click / Tap',
    section: 'Arcade',
  },
  {
    id: 'arcade-simon',
    name: 'Simon Says',
    description: 'Repeat the ever-growing colour sequence without a mistake.',
    tags: ['Memory', 'Mouse'],
    color: '#FFB6C1',
    textColor: '#880E4F',
    emoji: '🎨',
    highScoreKey: 'highScore',
    controls: 'Click / Tap',
    section: 'Arcade',
  },
  {
    id: 'arcade-stacker',
    name: 'Stack',
    description: 'Stack the blocks perfectly — narrower with every layer.',
    tags: ['Timing', 'Keyboard'],
    color: '#FFE4B5',
    textColor: '#BF360C',
    emoji: '🏗️',
    highScoreKey: 'highScore',
    controls: 'Space / Tap',
    section: 'Arcade',
  },
  {
    id: 'arcade-flappy',
    name: 'Flappy Dot',
    description: 'Tap to flap through the gaps — one hit and it\'s over.',
    tags: ['Reflex', 'Keyboard'],
    color: '#DDA0DD',
    textColor: '#4A148C',
    emoji: '⚪',
    highScoreKey: 'highScore',
    controls: 'Space / Tap',
    section: 'Arcade',
  },
  {
    id: 'arcade-reaction',
    name: 'Reaction Time',
    description: 'Hit the button the instant the screen flashes green.',
    tags: ['Reflex', 'Mouse'],
    color: '#98D8C8',
    textColor: '#004D40',
    emoji: '⚡',
    highScoreKey: 'bestMs',
    controls: 'Space / Click',
    section: 'Arcade',
  },
  {
    id: 'arcade-match3',
    name: 'Gem Blast',
    description: 'Swap gems to make rows of three — clear the board before time runs out.',
    tags: ['Puzzle', 'Mouse'],
    color: '#F0E68C',
    textColor: '#827717',
    emoji: '💎',
    highScoreKey: 'highScore',
    controls: 'Click / Swap',
    section: 'Arcade',
  },
]

export const ARCADE_GAME_IDS = new Set(ARCADE_GAMES.map((g) => g.id))

export function getArcadeGame(id: string): ArcadeGame | undefined {
  return ARCADE_GAMES.find((g) => g.id === id)
}
