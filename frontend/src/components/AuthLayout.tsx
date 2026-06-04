import { ReactNode } from 'react'
import { ChefHat, Sparkles, Wine, QrCode } from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  description?: string
}

const AuthLayout = ({ children, title, subtitle, description }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%)]" />
        <div className="relative z-10 flex flex-col justify-center px-12 py-16 max-w-xl">
          <p className="text-sm uppercase tracking-[0.2em] text-white/80 mb-4">Premium restaurant SaaS</p>
          <h1 className="text-4xl xl:text-5xl font-semibold leading-tight mb-6">
            Run service, kitchen, and billing from one calm control room.
          </h1>
          <p className="text-white/85 text-lg mb-10">
            Smart Dine unifies live orders, kitchen display, QR guest ordering, and GST-ready billing.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/10 backdrop-blur p-4 flex items-center gap-3">
              <ChefHat className="h-8 w-8" />
              <span className="text-sm font-medium">Kitchen sync</span>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur p-4 flex items-center gap-3">
              <QrCode className="h-8 w-8" />
              <span className="text-sm font-medium">QR ordering</span>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur p-4 flex items-center gap-3">
              <Wine className="h-8 w-8" />
              <span className="text-sm font-medium">Menu intelligence</span>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur p-4 flex items-center gap-3">
              <Sparkles className="h-8 w-8" />
              <span className="text-sm font-medium">Insights</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        
        {/* Mobile Decorative Background Blobs */}
        <div className="absolute top-[-5%] left-[-10%] w-80 h-80 bg-amber-500/30 dark:bg-amber-500/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70 lg:hidden pointer-events-none" />
        <div className="absolute bottom-[-5%] right-[-10%] w-80 h-80 bg-orange-600/30 dark:bg-orange-600/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70 lg:hidden pointer-events-none" />
        
        <div className="w-full max-w-md relative z-10 bg-white/60 dark:bg-slate-900/60 lg:bg-transparent lg:dark:bg-transparent backdrop-blur-xl lg:backdrop-blur-none p-6 sm:p-10 lg:p-0 rounded-[2rem] shadow-2xl shadow-orange-500/5 lg:shadow-none border border-white/40 dark:border-slate-700/50 lg:border-none">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-8 text-center sm:text-left">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/30 flex items-center justify-center shrink-0">
              <ChefHat className="h-7 w-7 text-white" />
            </div>
            <div>
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white block">
                Smart Dine
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-500 tracking-widest uppercase mt-1 block">
                Restaurant OS
              </span>
            </div>
          </div>

          <div className="text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-6">{subtitle}</p>
            {description && <p className="text-sm text-slate-500 mb-8">{description}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
