// How to make animated gradient border 👇
// https://cruip-tutorials.vercel.app/animated-gradient-border/
function BorderAnimatedContainer({ children }) {
  return (
    <div className="w-full h-full rounded-2xl p-[2px] animate-border relative" style={{ background: 'conic-gradient(from var(--border-angle), rgba(71, 85, 105, 0.48) 80%, rgb(6 182 212) 86%, rgb(103 232 249) 90%, rgb(6 182 212) 94%, rgba(71, 85, 105, 0.48))' }}>
      <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex overflow-hidden">
        {children}
      </div>
    </div>
  );
}
export default BorderAnimatedContainer;
