'use client'

import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { TransferForm } from '@/components/transactions/transfer-form'

export function QuickEntry() {
  const [showExpense, setShowExpense] = useState(false)
  const [showIncome, setShowIncome] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setShowExpense(true)}
          className="flex flex-col items-center gap-2 bg-danger/10 hover:bg-danger/15 text-danger rounded-xl p-4 transition-colors border border-danger/20"
        >
          <ArrowDownCircle size={28} />
          <span className="font-semibold text-xs">Gasto</span>
        </button>
        <button
          onClick={() => setShowIncome(true)}
          className="flex flex-col items-center gap-2 bg-success/10 hover:bg-success/15 text-success rounded-xl p-4 transition-colors border border-success/20"
        >
          <ArrowUpCircle size={28} />
          <span className="font-semibold text-xs">Ingreso</span>
        </button>
        <button
          onClick={() => setShowTransfer(true)}
          className="flex flex-col items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl p-4 transition-colors border border-blue-200"
        >
          <ArrowLeftRight size={28} />
          <span className="font-semibold text-xs">Traspaso</span>
        </button>
      </div>

      <Modal open={showExpense} onClose={() => setShowExpense(false)} title="Nuevo gasto">
        <TransactionForm type="expense" onSuccess={() => setShowExpense(false)} />
      </Modal>

      <Modal open={showIncome} onClose={() => setShowIncome(false)} title="Nuevo ingreso">
        <TransactionForm type="income" onSuccess={() => setShowIncome(false)} />
      </Modal>

      <Modal open={showTransfer} onClose={() => setShowTransfer(false)} title="Traspaso entre cuentas">
        <TransferForm onSuccess={() => setShowTransfer(false)} />
      </Modal>
    </>
  )
}
