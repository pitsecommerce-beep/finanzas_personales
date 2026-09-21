'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Select } from '@/components/ui/select'
import { BANKS, VOUCHER_BRANDS, INVESTMENT_PLATFORMS } from '@/lib/constants/banks'
import { CARD_COLORS } from '@/lib/constants/colors'
import { useAccounts } from '@/lib/data/accounts'
import { useToast } from '@/components/ui/toast'
import type { Account, AccountType, YieldCompounding, LiquidityType } from '@/types/database'

interface CardFormProps {
  card?: Account
  onSuccess?: () => void
}

export function CardForm({ card, onSuccess }: CardFormProps) {
  const [institution, setInstitution] = useState(card?.institution ?? '')
  const [alias, setAlias] = useState(card?.alias ?? '')
  const [accountType, setAccountType] = useState<AccountType>(card?.account_type ?? 'credit_card')
  const [lastFour, setLastFour] = useState(card?.last_four ?? '')
  const [cutOffDay, setCutOffDay] = useState(card?.cut_off_day?.toString() ?? '')
  const [paymentDay, setPaymentDay] = useState(card?.payment_day?.toString() ?? '')
  const [creditLimit, setCreditLimit] = useState(card?.credit_limit?.toString() ?? '')
  const [openingBalance, setOpeningBalance] = useState(card?.opening_balance?.toString() ?? '0')
  const [interestRate, setInterestRate] = useState(card?.interest_rate_annual?.toString() ?? '')
  const [yieldCompounding, setYieldCompounding] = useState<YieldCompounding>(card?.yield_compounding ?? 'daily')
  const [liquidity, setLiquidity] = useState<LiquidityType>(card?.liquidity ?? 'immediate')
  const [color, setColor] = useState(card?.color ?? '#14B8A6')
  const [notes, setNotes] = useState(card?.notes ?? '')
  const [loading, setLoading] = useState(false)

  const { addAccount, updateAccount } = useAccounts()
  const { toast } = useToast()

  const isEditing = !!card

  useEffect(() => {
    if (card) {
      setInstitution(card.institution ?? '')
      setAlias(card.alias)
      setAccountType(card.account_type)
      setLastFour(card.last_four ?? '')
      setCutOffDay(card.cut_off_day?.toString() ?? '')
      setPaymentDay(card.payment_day?.toString() ?? '')
      setCreditLimit(card.credit_limit?.toString() ?? '')
      setOpeningBalance(card.opening_balance?.toString() ?? '0')
      setInterestRate(card.interest_rate_annual?.toString() ?? '')
      setYieldCompounding(card.yield_compounding ?? 'daily')
      setLiquidity(card.liquidity ?? 'immediate')
      setColor(card.color)
      setNotes(card.notes ?? '')
    }
  }, [card])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const isSavings = accountType === 'savings'
    const isInvestment = accountType === 'investment'
    const hasOpeningBalance = accountType === 'debit' || accountType === 'cash' || isSavings || accountType === 'voucher' || isInvestment

    const accountData: Record<string, unknown> = {
      institution: accountType === 'cash' ? 'Efectivo' : (accountType === 'voucher' ? institution : institution),
      alias: accountType === 'cash' && !alias ? 'Dinero en efectivo' : alias,
      name: alias || 'Cuenta',
      account_type: accountType,
      last_four: (accountType === 'cash' || accountType === 'voucher' || accountType === 'investment') ? null : (lastFour || null),
      cut_off_day: accountType === 'credit_card' ? parseInt(cutOffDay) : null,
      payment_day: accountType === 'credit_card' ? parseInt(paymentDay) : null,
      credit_limit: accountType === 'credit_card' && creditLimit ? parseFloat(creditLimit) : null,
      opening_balance: hasOpeningBalance && openingBalance ? parseFloat(openingBalance) : 0,
      color,
      notes: notes || null,
    }

    if (isSavings) {
      accountData.yields_enabled = true
      accountData.interest_rate_annual = interestRate ? parseFloat(interestRate) : null
      accountData.yield_compounding = yieldCompounding
      accountData.liquidity = liquidity
    } else {
      accountData.yields_enabled = false
      accountData.interest_rate_annual = null
      accountData.yield_compounding = null
      accountData.liquidity = null
    }

    if (isInvestment) {
      accountData.institution = institution || 'Inversion'
      accountData.liquidity = liquidity
    }

    let result
    if (isEditing) {
      result = await updateAccount(card.id, accountData as Partial<Account>)
    } else {
      result = await addAccount(accountData)
    }

    setLoading(false)

    if (result?.error) {
      toast(`Error al ${isEditing ? 'actualizar' : 'guardar'}`, 'error')
      return
    }

    toast(isEditing ? 'Actualizado' : 'Agregado', 'success')
    onSuccess?.()
  }

  const typeOptions: { value: AccountType; label: string }[] = [
    { value: 'credit_card', label: 'Credito' },
    { value: 'debit', label: 'Debito' },
    { value: 'savings', label: 'Ahorro' },
    { value: 'cash', label: 'Efectivo' },
    { value: 'voucher', label: 'Vales' },
    { value: 'investment', label: 'Inversion' },
  ]

  const showBank = accountType !== 'cash' && accountType !== 'voucher' && accountType !== 'investment'
  const showDigits = accountType !== 'cash' && accountType !== 'voucher' && accountType !== 'investment'
  const showOpeningBalance = accountType === 'debit' || accountType === 'cash' || accountType === 'savings' || accountType === 'voucher' || accountType === 'investment'

  const compoundingOptions = [
    { value: 'daily', label: 'Diario' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'annual', label: 'Anual' },
  ]

  const liquidityOptions = [
    { value: 'immediate', label: 'Inmediata' },
    { value: 't_plus_1', label: '24 horas' },
    { value: 't_plus_2', label: '48 horas' },
    { value: 'locked', label: 'Bloqueado / Plazo fijo' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Tipo<span className="ml-0.5">*</span></label>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {typeOptions.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setAccountType(t.value)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                accountType === t.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {showBank && (
        <Select
          id="bank"
          label="Banco / Institucion"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          options={BANKS.map((b) => ({ value: b, label: b }))}
          placeholder="Selecciona"
          required
        />
      )}

      {accountType === 'voucher' && (
        <Select
          id="voucherBrand"
          label="Marca de vales"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          options={VOUCHER_BRANDS.map((b) => ({ value: b, label: b }))}
          placeholder="Selecciona"
          required
        />
      )}

      {accountType === 'investment' && (
        <Select
          id="investPlatform"
          label="Plataforma"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          options={INVESTMENT_PLATFORMS.map((p) => ({ value: p, label: p }))}
          placeholder="Selecciona"
          required
        />
      )}

      <Input
        id="alias"
        label="Alias"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder={
          accountType === 'cash' ? 'Ej: Mi cartera' :
          accountType === 'voucher' ? 'Ej: Vales trabajo' :
          accountType === 'savings' ? 'Ej: Cuenta Nu ahorro' :
          accountType === 'investment' ? 'Ej: NAFTRAC - GBM' :
          'Ej: Mi Oro BBVA'
        }
        required={accountType !== 'cash'}
      />

      {showDigits && (
        <Input
          id="lastFour"
          label="Ultimos 4 digitos"
          value={lastFour}
          onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="1234"
          maxLength={4}
        />
      )}

      {accountType === 'credit_card' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="cutOff"
              label="Dia de corte"
              type="number"
              min="1"
              max="31"
              value={cutOffDay}
              onChange={(e) => setCutOffDay(e.target.value)}
              placeholder="15"
              required
            />
            <Input
              id="paymentDay"
              label="Dia de pago"
              type="number"
              min="1"
              max="31"
              value={paymentDay}
              onChange={(e) => setPaymentDay(e.target.value)}
              placeholder="5"
              required
            />
          </div>
          <CurrencyInput
            id="creditLimit"
            label="Limite de credito"
            value={creditLimit}
            onChange={setCreditLimit}
            placeholder="50,000"
          />
        </>
      )}

      {showOpeningBalance && (
        <CurrencyInput
          id="openingBalance"
          label="Saldo inicial"
          value={openingBalance}
          onChange={setOpeningBalance}
          placeholder="0.00"
        />
      )}

      {accountType === 'savings' && (
        <>
          <Input
            id="interestRate"
            label="Tasa anual (%)"
            type="number"
            step="0.001"
            min="0"
            max="100"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="Ej: 15.0"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              id="yieldCompounding"
              label="Frecuencia de rendimiento"
              value={yieldCompounding}
              onChange={(e) => setYieldCompounding(e.target.value as YieldCompounding)}
              options={compoundingOptions}
            />
            <Select
              id="liquidity"
              label="Disponibilidad del dinero"
              value={liquidity}
              onChange={(e) => setLiquidity(e.target.value as LiquidityType)}
              options={liquidityOptions}
            />
          </div>
        </>
      )}

      {accountType === 'investment' && (
        <>
          <Select
            id="liquidity"
            label="Disponibilidad del dinero"
            value={liquidity}
            onChange={(e) => setLiquidity(e.target.value as LiquidityType)}
            options={liquidityOptions}
          />
          <Input
            id="notes"
            label="Notas (ticker, titulos, etc.)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: NAFTRAC 10 titulos a $52.30"
          />
        </>
      )}

      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Color</label>
        <div className="flex gap-2 flex-wrap">
          {CARD_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                color === c.value ? 'border-accent scale-110' : 'border-transparent'
              } ${c.value === '#F5F0E8' ? 'ring-1 ring-gray-200' : ''}`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {isEditing ? 'Guardar cambios' : 'Agregar'}
      </Button>
    </form>
  )
}
