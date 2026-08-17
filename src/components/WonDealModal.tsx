import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyExact, parseCurrencyInput } from "@/lib/formatCurrency";

interface WonDealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (value: number) => void;
  dealTitle: string;
  /** Current value on the deal, pre-filled so an already-priced deal is one click. */
  currentValue: number;
}

/**
 * Mirrors LostReasonModal: closing a deal must record WHY it was lost, and
 * equally must record HOW MUCH was won.
 *
 * Leads created from a first inbound message start at `value = 0`
 * (ConversationRepository.createLeadForContact), and nothing used to prompt for
 * a figure — so revenue-by-campaign would have summed to R$ 0 for every
 * campaign. Requiring the closed value here is what makes the financial
 * reporting real rather than decorative.
 */
export const WonDealModal = ({ open, onOpenChange, onConfirm, dealTitle, currentValue }: WonDealModalProps) => {
  const [raw, setRaw] = useState("");

  // Re-seed each time the modal opens so switching deals never carries the
  // previous deal's figure over.
  useEffect(() => {
    if (open) setRaw(currentValue > 0 ? String(currentValue) : "");
  }, [open, currentValue]);

  const parsed = parseCurrencyInput(raw);
  // A won deal worth nothing is almost always an unfilled field, not a real
  // R$ 0 sale — so zero is rejected rather than silently persisted.
  const isValid = parsed !== null && parsed > 0;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(parsed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-popover border-border" aria-describedby="won-value-description">
        <DialogHeader>
          <DialogTitle className="text-foreground">Marcar Negócio como Ganho</DialogTitle>
          <DialogDescription id="won-value-description" className="text-muted-foreground">
            Você está marcando "{dealTitle}" como ganho. Informe o valor fechado — é ele que
            aparece no faturamento por campanha.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="won-value">Valor fechado (R$) *</Label>
            <Input
              id="won-value"
              inputMode="decimal"
              autoFocus
              placeholder="Ex: 4.250,00"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && isValid) handleConfirm(); }}
            />
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {isValid
                ? formatCurrencyExact(parsed)
                : raw.trim()
                  ? 'Informe um valor maior que zero.'
                  : 'Sem o valor fechado, este ganho não entra no relatório de receita.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Confirmar Ganho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
