import { GlowCard } from './spotlight-card';

export function Default() {
  return (
    <div className="w-screen h-screen flex flex-row items-center justify-center gap-10 custom-cursor">
      <GlowCard />
      <GlowCard />
      <GlowCard />
    </div>
  );
}
