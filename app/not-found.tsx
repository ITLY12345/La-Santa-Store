import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-4">
        <span className="font-mono text-xl font-black">404</span>
      </div>
      <h1 className="text-xl sm:text-2xl font-black tracking-tight mb-2">
        Página No Encontrada
      </h1>
      <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
        La sección que estás buscando no existe o fue reubicada en nuestro catálogo oficial de La Santa Store.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-full bg-[#111111] text-white text-xs font-bold flex items-center gap-2 hover:bg-zinc-800 transition"
      >
        <Home className="w-4 h-4" />
        <span>Volver a la Tienda</span>
      </Link>
    </div>
  );
}
