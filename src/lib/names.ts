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

export function randomName() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adjective} ${noun}`
}
