import React, { useState } from 'react';
import { Mic, Eye, EyeOff, Play, Loader2, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/Button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { extractEdgeFunctionError } from '@/lib/edgeFunctionError';
import { toast } from 'sonner';

interface StepElevenLabsProps {
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  elevenLabsModel: string;
  audioResponseEnabled: boolean;
  elevenLabsStability: number;
  elevenLabsSimilarityBoost: number;
  elevenLabsSpeed: number;
  onApiKeyChange: (value: string) => void;
  onVoiceIdChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onAudioEnabledChange: (value: boolean) => void;
  onStabilityChange: (value: number) => void;
  onSimilarityBoostChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  },
};

// Top ElevenLabs voices
const VOICES = [
  { id: '33B4UnXyTNbgLmdEDh5P', name: 'Keren - Young Brazilian Female', description: 'Feminina, brasileira (Padrão)' },
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', description: 'Feminina, natural' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Masculina, profissional' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Feminina, amigável' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Feminina, suave' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Masculina, casual' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Masculina, britânica' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Masculina, jovem' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Feminina, elegante' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Feminina, expressiva' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Masculina, clara' },
];

const MODELS = [
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5', description: 'Rápido, 32 idiomas' },
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', description: 'Alta qualidade, 29 idiomas' },
  { id: 'eleven_turbo_v2', name: 'Turbo v2', description: 'Rápido, apenas inglês' },
];

export const StepElevenLabs: React.FC<StepElevenLabsProps> = ({
  elevenLabsApiKey,
  elevenLabsVoiceId,
  elevenLabsModel,
  audioResponseEnabled,
  elevenLabsStability,
  elevenLabsSimilarityBoost,
  elevenLabsSpeed,
  onApiKeyChange,
  onVoiceIdChange,
  onModelChange,
  onAudioEnabledChange,
  onStabilityChange,
  onSimilarityBoostChange,
  onSpeedChange,
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestVoice = async () => {
    if (!elevenLabsApiKey) {
      toast.error('Digite a API Key primeiro');
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-elevenlabs-tts', {
        body: {
          text: 'Olá! Esta é uma mensagem de teste do sistema de voz.',
          apiKey: elevenLabsApiKey,
          voiceId: elevenLabsVoiceId,
          model: elevenLabsModel,
          stability: elevenLabsStability,
          similarityBoost: elevenLabsSimilarityBoost,
          speed: elevenLabsSpeed,
        },
      });

      if (error) throw new Error(await extractEdgeFunctionError(error, 'Erro ao testar voz'));

      if (data?.success && data?.audioBase64) {
        // Create audio from base64
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        toast.success(`Áudio reproduzido com sucesso! (${(data.duration_ms / 1000).toFixed(1)}s)`);
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        toast.success('Teste de voz concluído!');
      }
    } catch (error: any) {
      console.error('Error testing voice:', error);
      toast.error(error.message || 'Erro ao testar voz');
    } finally {
      setIsTesting(false);
    }
  };

  const selectedVoice = VOICES.find(v => v.id === elevenLabsVoiceId);

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <motion.div 
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 flex items-center justify-center"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Mic className="w-8 h-8 text-violet-600" />
        </motion.div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Respostas em Áudio</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Configure o ElevenLabs para que seu agente responda também por áudio.
        </p>
        <p className="text-xs text-amber-600 mt-2">
          ⚡ Esta configuração é opcional
        </p>
      </motion.div>

      <div className="space-y-6 max-w-md mx-auto">
        {/* Enable Audio Toggle */}
        <motion.div variants={itemVariants} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-violet-600" />
            <div>
              <Label className="text-foreground">Habilitar Respostas em Áudio</Label>
              <p className="text-xs text-muted-foreground">O agente enviará mensagens de voz</p>
            </div>
          </div>
          <Switch
            checked={audioResponseEnabled}
            onCheckedChange={onAudioEnabledChange}
          />
        </motion.div>

        {/* API Key */}
        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="elevenLabsApiKey" className="text-foreground flex items-center gap-2">
            <Mic className="w-4 h-4 text-muted-foreground" />
            API Key do ElevenLabs
          </Label>
          <div className="relative">
            <Input
              id="elevenLabsApiKey"
              type={showApiKey ? 'text' : 'password'}
              value={elevenLabsApiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="sk-..."
              className="bg-background border-border focus:border-ring text-foreground placeholder:text-muted-foreground pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Obtenha em{' '}
            <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
              elevenlabs.io
            </a>
          </p>
        </motion.div>

        {/* Voice Selector */}
        <motion.div variants={itemVariants} className="space-y-2">
          <Label className="text-foreground">Voz</Label>
          <Select value={elevenLabsVoiceId} onValueChange={onVoiceIdChange}>
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue placeholder="Selecione uma voz">
                {selectedVoice ? `${selectedVoice.name} - ${selectedVoice.description}` : 'Selecione uma voz'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              {VOICES.map((voice) => (
                <SelectItem key={voice.id} value={voice.id} className="text-foreground hover:bg-accent focus:bg-accent">
                  <span className="font-medium">{voice.name}</span>
                  <span className="text-muted-foreground ml-2">- {voice.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Model Selector */}
        <motion.div variants={itemVariants} className="space-y-2">
          <Label className="text-foreground">Modelo</Label>
          <Select value={elevenLabsModel} onValueChange={onModelChange}>
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue placeholder="Selecione um modelo" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              {MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id} className="text-foreground hover:bg-accent focus:bg-accent">
                  <span className="font-medium">{model.name}</span>
                  <span className="text-muted-foreground ml-2">- {model.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Voice Settings Sliders */}
        <motion.div variants={itemVariants} className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
          <h4 className="text-sm font-medium text-foreground">Ajustes da Voz</h4>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Estabilidade</span>
                <span className="text-muted-foreground">{(elevenLabsStability * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[elevenLabsStability]}
                onValueChange={([v]) => onStabilityChange(v)}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Similaridade</span>
                <span className="text-muted-foreground">{(elevenLabsSimilarityBoost * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[elevenLabsSimilarityBoost]}
                onValueChange={([v]) => onSimilarityBoostChange(v)}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Velocidade</span>
                <span className="text-muted-foreground">{elevenLabsSpeed.toFixed(1)}x</span>
              </div>
              <Slider
                value={[elevenLabsSpeed]}
                onValueChange={([v]) => onSpeedChange(v)}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Test Button */}
        <motion.div variants={itemVariants}>
          <Button
            variant="outline"
            onClick={handleTestVoice}
            disabled={!elevenLabsApiKey || isTesting}
            className="w-full gap-2"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Testar Voz
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
