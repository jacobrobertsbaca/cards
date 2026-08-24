import { CreateGameForm } from "@/components/create-game-form"

export default function Home() {
  return (
    <main className="flex min-h-svh items-start justify-center px-6 py-16 md:py-24 md:pl-[max(1.5rem,calc(var(--sidebar-content-pad,0rem)+1.5rem))]">
      <CreateGameForm />
    </main>
  )
}
