import { LoaderIcon } from "lucide-react";
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <LoaderIcon className="size-10 animate-spin text-cyan-500" />
    </div>
  );
}
export default PageLoader;
