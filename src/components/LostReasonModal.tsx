import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/services/api";
import type { LossReason } from "@/types";

interface LostReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reasonCode: string, detail?: string) => void;
  dealTitle: string;
}

/**
 * The reason is now a CODE from the `loss_reasons` taxonomy, with the old free
 * text kept as optional detail.
 *
 * Free text alone could not be counted or ranked, so "o que está deixando de
 * converter?" was unanswerable — every loss was a unique sentence. The code is
 * what the Perdas report groups by; the detail is what a human reads on the
 * specific deal.
 */
export const LostReasonModal = ({ open, onOpenChange, onConfirm, dealTitle }: LostReasonModalProps) => {
  const [reasons, setReasons] = useState<LossReason[]>([]);
  const [code, setCode] = useState("");
  const [detail, setDetail] = useState("");

  // Loaded on open rather than on mount: the modal is always rendered by Kanban,
  // so mounting-time loading would fetch the taxonomy on every board visit.
  useEffect(() => {
    if (!open) return;
    setCode("");
    setDetail("");
    api.fetchLossReasons().then(setReasons).catch(() => setReasons([]));
  }, [open]);

  const handleConfirm = () => {
    if (!code) return;
    onConfirm(code, detail.trim() || undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-popover border-border" aria-describedby="lost-reason-description">
        <DialogHeader>
          <DialogTitle className="text-foreground">Marcar Negócio como Perdido</DialogTitle>
          <DialogDescription id="lost-reason-description" className="text-muted-foreground">
            Você está marcando "{dealTitle}" como perdido. O motivo alimenta o relatório
            de perdas — por isso ele é uma escolha, não texto livre.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason-code">Motivo da perda *</Label>
            <Select value={code} onValueChange={setCode}>
              <SelectTrigger id="reason-code">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reasons.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum motivo cadastrado. Fale com um administrador.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason-detail">Detalhes (opcional)</Label>
            <Textarea
              id="reason-detail"
              placeholder="Ex: pediu 20% de desconto e fechou com a concorrência."
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!code} variant="danger">
            Confirmar Perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
