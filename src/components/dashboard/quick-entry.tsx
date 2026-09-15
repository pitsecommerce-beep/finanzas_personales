'use client'

import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { TransactionForm } from '@/components/transactions/transaction-form'

export function QuickEntry() {
  const [showExpense, setShowExpense] = useState(false)
  const [showIncome, setShowIncome] = useState(false)

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowExpense(true)}
          className="flex flex-col items-center gap-2 bg-danger/10 hover:bg-danger/15 text-danger rounded-xl p-5 transition-colors border border-danger/20"
        >
          <ArrowDownCircle size={32} />
          <span className="font-semibold text-sm">Agregar gasto</span>
        </button>
        <button
          onClick={() => setShowIncome(true)}
          className="flex flex-col items-center gap-2 bg-success/10 hover:bg-success/15 text-success rounded-xl p-5 transition-colors border border-success/20"
        >
          <ArrowUpCircle size={32} />
          <span className="font-semibold text-sm">Agregar ingreso</span>
        </button>
      </div>

      <Modal open={showExpense} onClose={() => setShowExpense(false)} title="Nuevo gasto">
        <TransactionForm type="expense" onSuccess={() => setShowExpense(false)} />
      </Modal>

      <Modal open={showIncome} onClose={() => setShowIncome(false)} title="Nuevo ingreso">
        <TransactionForm type="income" onSuccess={() => setShowIncome(false)} />
      </Modal>
    </>
  )
}
