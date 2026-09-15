export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent">FinanzApp</h1>
          <p className="text-gray-400 mt-2 text-sm">Control financiero inteligente</p>
        </div>
        {children}
      </div>
    </div>
  )
}
