import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, GripVertical, Plus, Lock, Bot, User, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { KanbanColumn } from '@/types';
import { api } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PipelineSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
}

const STAGE_COLORS = [
  { value: 'border-slate-500', label: 'Cinza', preview: 'bg-slate-500' },
  { value: 'border-cyan-500', label: 'Ciano', preview: 'bg-cyan-500' },
  { value: 'border-violet-500', label: 'Violeta', preview: 'bg-violet-500' },
  { value: 'border-orange-500', label: 'Laranja', preview: 'bg-orange-500' },
  { value: 'border-emerald-500', label: 'Verde', preview: 'bg-emerald-500' },
  { value: 'border-red-500', label: 'Vermelho', preview: 'bg-red-500' },
  { value: 'border-blue-500', label: 'Azul', preview: 'bg-blue-500' },
  { value: 'border-yellow-500', label: 'Amarelo', preview: 'bg-yellow-500' },
  { value: 'border-pink-500', label: 'Rosa', preview: 'bg-pink-500' },
  { value: 'border-indigo-500', label: 'Índigo', preview: 'bg-indigo-500' },
];

export function PipelineSettingsModal({ open, onClose, onSave }: PipelineSettingsModalProps) {
  const [stages, setStages] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIsAiManaged, setEditIsAiManaged] = useState(false);
  const [editTriggerCriteria, setEditTriggerCriteria] = useState('');
  const [newStageTitle, setNewStageTitle] = useState('');
  const [newStageColor, setNewStageColor] = useState('border-slate-500');
  const [newStageIsAiManaged, setNewStageIsAiManaged] = useState(false);
  const [newStageTriggerCriteria, setNewStageTriggerCriteria] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ stageId: string; stageName: string } | null>(null);
  const [availableStages, setAvailableStages] = useState<KanbanColumn[]>([]);
  const [moveToStageId, setMoveToStageId] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      loadStages();
    }
  }, [open]);

  const loadStages = async () => {
    setLoading(true);
    try {
      const data = await api.fetchPipelineStages();
      setStages(data);
    } catch (error) {
      toast.error('Erro ao carregar etapas');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (stage: KanbanColumn) => {
    setEditingId(stage.id);
    setEditTitle(stage.title);
    setEditColor(stage.color);
    setEditIsAiManaged(stage.isAiManaged);
    setEditTriggerCriteria(stage.aiTriggerCriteria || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    const editing = stages.find(s => s.id === editingId);
    try {
      await api.updatePipelineStage(editingId, {
        // Ganho/Perdido are recognised by name across the app, so system stages keep theirs.
        title: editing?.isSystem ? editing.title : editTitle,
        color: editColor,
        isAiManaged: editIsAiManaged,
        aiTriggerCriteria: editTriggerCriteria || null,
      } as any);
      
      toast.success('Etapa atualizada');
      setEditingId(null);
      loadStages();
      onSave?.();
    } catch (error) {
      toast.error('Erro ao atualizar etapa');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditColor('');
    setEditIsAiManaged(false);
    setEditTriggerCriteria('');
  };

  const handleDeleteClick = async (stage: KanbanColumn) => {
    // Check if there are deals in this stage
    try {
      // Count directly: the board list hides deals closed long ago, which still block a delete.
      const { count, error } = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('stage_id', stage.id);
      if (error) throw error;

      if ((count ?? 0) > 0) {
        // Show dialog to move deals
        const otherStages = stages.filter(s => s.id !== stage.id);
        setAvailableStages(otherStages);
        setMoveToStageId(otherStages[0]?.id || '');
        setDeleteConfirm({ stageId: stage.id, stageName: stage.title });
      } else {
        // No deals, delete directly
        await api.deletePipelineStage(stage.id);
        toast.success('Etapa removida');
        loadStages();
        onSave?.();
      }
    } catch (error) {
      toast.error('Não foi possível verificar os negócios desta etapa');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await api.deletePipelineStage(deleteConfirm.stageId, moveToStageId);
      toast.success('Etapa removida e negócios movidos');
      setDeleteConfirm(null);
      setMoveToStageId('');
      loadStages();
      onSave?.();
    } catch (error) {
      toast.error('Erro ao remover etapa');
    }
  };

  const handleAddStage = async () => {
    if (!newStageTitle.trim()) {
      toast.error('Digite um nome para a etapa');
      return;
    }

    try {
      await api.createPipelineStage({
        title: newStageTitle,
        color: newStageColor,
        isAiManaged: newStageIsAiManaged,
        aiTriggerCriteria: newStageTriggerCriteria || undefined,
      });
      
      toast.success('Etapa criada');
      setNewStageTitle('');
      setNewStageColor('border-slate-500');
      setNewStageIsAiManaged(false);
      setNewStageTriggerCriteria('');
      loadStages();
      onSave?.();
    } catch (error) {
      toast.error('Erro ao criar etapa');
    }
  };

  /** Keyboard alternative to dragging a stage. */
  const moveStage = async (index: number, step: -1 | 1) => {
    const target = index + step;
    if (target < 0 || target >= stages.length) return;
    const previous = stages;
    const next = [...stages];
    [next[index], next[target]] = [next[target], next[index]];
    setStages(next);
    try {
      await api.reorderPipelineStages(next.map(s => s.id));
      onSave?.();
    } catch {
      toast.error('Não foi possível reordenar as etapas');
      setStages(previous);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newStages = [...stages];
    const draggedItem = newStages[draggedIndex];
    newStages.splice(draggedIndex, 1);
    newStages.splice(index, 0, draggedItem);
    
    setStages(newStages);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    try {
      const stageIds = stages.map(s => s.id);
      await api.reorderPipelineStages(stageIds);
      toast.success('Ordem atualizada');
      onSave?.();
    } catch (error) {
      toast.error('Erro ao reordenar etapas');
      loadStages(); // Reload on error
    } finally {
      setDraggedIndex(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Etapas do funil</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Existing Stages */}
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : (
                stages.map((stage, index) => (
                  <div
                    key={stage.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 rounded-lg bg-secondary cursor-move hover:bg-accent transition-colors ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <GripVertical className="w-5 h-5 text-icon" aria-hidden="true" />

                    <div className={`w-3 h-3 rounded-full ${stage.color.replace('border-', 'bg-')}`} aria-hidden="true" />

                    {editingId === stage.id ? (
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={stage.isSystem ? stage.title : editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            disabled={stage.isSystem}
                            title={stage.isSystem ? 'O nome das etapas Ganho e Perdido não pode mudar' : undefined}
                            aria-label="Nome da etapa"
                            className="flex-1"
                            placeholder="Nome da etapa"
                          />
                          <Select value={editColor} onValueChange={setEditColor}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STAGE_COLORS.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${c.preview}`} />
                                    {c.label}
                                  </div>
                                </SelectItem>
                              ))
                              }
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Stage Type Selector */}
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Quem move negócios para cá</Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={!editIsAiManaged ? "default" : "outline"}
                              onClick={() => setEditIsAiManaged(false)}
                              aria-pressed={!editIsAiManaged}
                              className="flex-1 rounded-full"
                            >
                              <User className="w-3 h-3 mr-1" aria-hidden="true" />
                              Só a equipe
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={editIsAiManaged ? "default" : "outline"}
                              onClick={() => setEditIsAiManaged(true)}
                              aria-pressed={editIsAiManaged}
                              className="flex-1 rounded-full"
                            >
                              <Bot className="w-3 h-3 mr-1" aria-hidden="true" />
                              A Lu também
                            </Button>
                          </div>
                        </div>

                        {/* AI Criteria (only show if AI Managed) */}
                        {editIsAiManaged && (
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Quando a Lu deve mover um negócio para esta etapa
                            </Label>
                            <Textarea
                              value={editTriggerCriteria}
                              onChange={(e) => setEditTriggerCriteria(e.target.value)}
                              placeholder="Ex: Lead demonstrou interesse claro e pediu demonstração..."
                              className="h-20 text-sm resize-none"
                            />
                          </div>
                        )}
                        
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="rounded-full">
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={handleSaveEdit} className="rounded-full">
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-1">
                          {/* Visual Indicator */}
                          {stage.isAiManaged ? (
                            stage.aiTriggerCriteria ? (
                              <Bot className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" aria-hidden="true" />
                            )
                          ) : (
                            <User className="w-4 h-4 text-icon flex-shrink-0" aria-hidden="true" />
                          )}
                          <div className="min-w-0">
                            <p className="text-[15px] font-medium text-foreground">{stage.title}</p>
                            <p className={`text-xs ${stage.isAiManaged && !stage.aiTriggerCriteria ? 'text-warning' : 'text-muted-foreground'}`}>
                              {!stage.isAiManaged
                                ? 'Só a equipe move'
                                : stage.aiTriggerCriteria
                                  ? 'A Lu também move'
                                  : 'A Lu move, mas falta dizer quando'}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => moveStage(index, -1)} disabled={index === 0} aria-label={`Subir ${stage.title}`} className="rounded-full w-8 h-8 p-0">
                          <ChevronUp className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => moveStage(index, 1)} disabled={index === stages.length - 1} aria-label={`Descer ${stage.title}`} className="rounded-full w-8 h-8 p-0">
                          <ChevronDown className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(stage)} aria-label={`Editar ${stage.title}`} className="rounded-full w-8 h-8 p-0">
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        {stage.isSystem ? (
                          <span className="w-8 h-8 flex items-center justify-center" title="Ganho e Perdido não podem ser removidas">
                            <Lock className="w-4 h-4 text-icon" aria-label="Etapa fixa, não pode ser removida" />
                          </span>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(stage)} aria-label={`Remover ${stage.title}`} className="rounded-full w-8 h-8 p-0">
                            <Trash2 className="w-4 h-4 text-destructive" aria-hidden="true" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add New Stage */}
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-medium">Nova etapa</Label>
              <div className="flex gap-2">
                <Input
                  value={newStageTitle}
                  onChange={(e) => setNewStageTitle(e.target.value)}
                  placeholder="Nome da etapa"
                  className="flex-1"
                />
                <Select value={newStageColor} onValueChange={setNewStageColor}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${c.preview}`} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))
                    }
                  </SelectContent>
                </Select>
              </div>
              
              {/* Stage Type Selector */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Quem move negócios para cá</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={!newStageIsAiManaged ? "default" : "outline"}
                    onClick={() => setNewStageIsAiManaged(false)}
                    aria-pressed={!newStageIsAiManaged}
                    className="flex-1 rounded-full"
                  >
                    <User className="w-3 h-3 mr-1" aria-hidden="true" />
                    Só a equipe
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={newStageIsAiManaged ? "default" : "outline"}
                    onClick={() => setNewStageIsAiManaged(true)}
                    aria-pressed={newStageIsAiManaged}
                    className="flex-1 rounded-full"
                  >
                    <Bot className="w-3 h-3 mr-1" aria-hidden="true" />
                    A Lu também
                  </Button>
                </div>
              </div>

              {/* AI Criteria (only show if AI Managed) */}
              {newStageIsAiManaged && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Quando a Lu deve mover um negócio para esta etapa
                  </Label>
                  <Textarea
                    value={newStageTriggerCriteria}
                    onChange={(e) => setNewStageTriggerCriteria(e.target.value)}
                    placeholder="Ex: Lead demonstrou interesse claro e pediu demonstração..."
                    className="h-20 text-sm resize-none"
                  />
                </div>
              )}
              
              <Button onClick={handleAddStage} className="w-full rounded-full">
                <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                Adicionar etapa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation with Deal Reallocation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover etapa "{deleteConfirm?.stageName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Há negócios nesta etapa. Escolha para onde movê-los antes de remover.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label>Mover negócios para</Label>
            <Select value={moveToStageId} onValueChange={setMoveToStageId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma etapa" />
              </SelectTrigger>
              <SelectContent>
                {availableStages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.title}
                  </SelectItem>
                ))
                }
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={!moveToStageId}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
