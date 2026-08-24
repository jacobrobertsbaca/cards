const ADJECTIVES = [
  "Swift",
  "Lucky",
  "Quiet",
  "Brave",
  "Clever",
  "Merry",
  "Dusty",
  "Silver",
  "Amber",
  "Hidden",
  "Gentle",
  "Wild",
  "Bright",
  "Sly",
  "Noble",
  "Sunny",
  "Velvet",
  "Rusty",
  "Bold",
  "Calm",
]

const NOUNS = [
  "Otter",
  "Finch",
  "Maple",
  "Heron",
  "Badger",
  "Cedar",
  "Fox",
  "Moth",
  "Wren",
  "Pebble",
  "Sparrow",
  "Clover",
  "Hare",
  "Ivy",
  "Lark",
  "Thistle",
  "Mink",
  "Acorn",
  "Fern",
  "Jay",
]

const BOT_ADJECTIVES = [
  "Chrome",
  "Steel",
  "Iron",
  "Copper",
  "Rusty",
  "Brass",
  "Tin",
  "Clank",
  "Spark",
  "Volt",
  "Alloy",
  "Welded",
  "Clockwork",
  "Magnetic",
  "Zinc",
  "Nickel",
  "Bronze",
  "Forged",
  "Hinged",
  "Wired",
]

const BOT_NOUNS = [
  "Drone",
  "Unit",
  "Bot",
  "Mech",
  "Chassis",
  "Golem",
  "Automaton",
  "Servo",
  "Gear",
  "Frame",
  "Clanker",
  "Piston",
  "Rivet",
  "Sparks",
  "Bolt",
  "Cogs",
  "Gasket",
  "Armature",
  "Reactor",
  "Sentinel",
]

function pick(list: string[]) {
  return list[Math.floor(Math.random() * list.length)]
}

export function randomName() {
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`
}

export function randomBotName() {
  return `${pick(BOT_ADJECTIVES)} ${pick(BOT_NOUNS)}`
}
