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

      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg" />
            <span className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Smart Dine
            </span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">{subtitle}</p>
          {description && <p className="text-sm text-slate-500 mb-8">{description}</p>}
          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
